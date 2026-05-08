/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord, ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { GrokProcessor, StreamlangStep } from '@kbn/streamlang';

// These mocks must be declared before the import below — `jest.mock` is
// hoisted, but the local references must come from `require(...)` once
// the module has been registered.
jest.mock('@kbn/streams-ai', () => ({
  suggestProcessingPipeline: jest.fn(),
  mergeSeedParsingProcessorIntoSuggestedPipeline: jest.fn(),
  buildDocumentStructureOverviewForPipelinePrompt: jest.fn(),
  formatUpstreamSeedParsingContextForPromptMarkdown: jest.fn(),
  fetchMappedFieldsForStreamProcessingSuggestions: jest.fn(),
  postParsePipelineDefinitionSchema: {},
}));

jest.mock('../../../routes/internal/streams/processing/simulation_handler', () => ({
  simulateProcessing: jest.fn(),
}));

jest.mock('../../../routes/internal/streams/management/seed_parsing_helpers', () => ({
  processGrokPatterns: jest.fn(),
  processDissectPattern: jest.fn(),
  extractParsedSampleDocuments: jest.fn(),
  formatInferenceErrorMeta: jest.fn().mockReturnValue(''),
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

// Older jest jsdom envs don't ship `AbortSignal.timeout`, but the
// `runExtractFieldsFlow` handler relies on it to compose an operation
// timeout signal with the caller-supplied request signal. Polyfill it
// locally so tests can exercise the full handler path without hitting
// "AbortSignal.timeout is not a function".
beforeAll(() => {
  if (typeof AbortSignal.timeout !== 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (AbortSignal as any).timeout = (ms: number) => {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(new Error(`Timeout after ${ms}ms`)), ms).unref?.();
      return ctrl.signal;
    };
  }
});

import {
  buildKeyValueHints,
  isExtractionStepOnField,
  runExtractFieldsFlow,
  stepWritesOrRemovesField,
  type RunExtractFieldsDeps,
} from './extract_fields_handler';
import {
  suggestProcessingPipeline,
  mergeSeedParsingProcessorIntoSuggestedPipeline,
  buildDocumentStructureOverviewForPipelinePrompt,
  formatUpstreamSeedParsingContextForPromptMarkdown,
  fetchMappedFieldsForStreamProcessingSuggestions,
} from '@kbn/streams-ai';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import {
  processGrokPatterns,
  processDissectPattern,
  extractParsedSampleDocuments,
} from '../../../routes/internal/streams/management/seed_parsing_helpers';

const mockSuggestProcessingPipeline = suggestProcessingPipeline as jest.MockedFunction<
  typeof suggestProcessingPipeline
>;
const mockMergeSeedParsingProcessorIntoSuggestedPipeline =
  mergeSeedParsingProcessorIntoSuggestedPipeline as jest.MockedFunction<
    typeof mergeSeedParsingProcessorIntoSuggestedPipeline
  >;
const mockBuildDocumentStructureOverviewForPipelinePrompt =
  buildDocumentStructureOverviewForPipelinePrompt as jest.MockedFunction<
    typeof buildDocumentStructureOverviewForPipelinePrompt
  >;
const mockFormatUpstreamSeedParsingContextForPromptMarkdown =
  formatUpstreamSeedParsingContextForPromptMarkdown as jest.MockedFunction<
    typeof formatUpstreamSeedParsingContextForPromptMarkdown
  >;
const mockFetchMappedFieldsForStreamProcessingSuggestions =
  fetchMappedFieldsForStreamProcessingSuggestions as jest.MockedFunction<
    typeof fetchMappedFieldsForStreamProcessingSuggestions
  >;
const mockSimulateProcessing = simulateProcessing as jest.MockedFunction<typeof simulateProcessing>;
const mockProcessGrokPatterns = processGrokPatterns as jest.MockedFunction<
  typeof processGrokPatterns
>;
const mockProcessDissectPattern = processDissectPattern as jest.MockedFunction<
  typeof processDissectPattern
>;
const mockExtractParsedSampleDocuments = extractParsedSampleDocuments as jest.MockedFunction<
  typeof extractParsedSampleDocuments
>;

describe('isExtractionStepOnField', () => {
  it('returns true for grok on the given field', () => {
    expect(
      isExtractionStepOnField({ action: 'grok', from: 'body.text', patterns: ['x'] }, 'body.text')
    ).toBe(true);
  });

  it('returns true for dissect on the given field', () => {
    expect(
      isExtractionStepOnField({ action: 'dissect', from: 'body.text', pattern: 'x' }, 'body.text')
    ).toBe(true);
  });

  it('returns false for non-extraction actions on the same field', () => {
    expect(
      isExtractionStepOnField({ action: 'set', to: 'body.text', value: 'x' }, 'body.text')
    ).toBe(false);
    expect(isExtractionStepOnField({ action: 'remove', from: 'body.text' }, 'body.text')).toBe(
      false
    );
  });

  it('returns false for grok on a different field', () => {
    expect(
      isExtractionStepOnField({ action: 'grok', from: 'message', patterns: ['x'] }, 'body.text')
    ).toBe(false);
  });

  it('returns false for non-objects and condition blocks', () => {
    expect(isExtractionStepOnField(null, 'body.text')).toBe(false);
    expect(isExtractionStepOnField('grok', 'body.text')).toBe(false);
    // Condition blocks are intentionally not introspected — false-positives there
    // would be misleading.
    expect(
      isExtractionStepOnField(
        { condition: { field: 'severity_text', eq: 'ERROR', steps: [] } },
        'body.text'
      )
    ).toBe(false);
  });
});

describe('stepWritesOrRemovesField', () => {
  // body.text is the canonical seed source; anything that mutates it must
  // run AFTER the new extraction reads it, never before.
  const sourceField = 'body.text';

  it('detects a `set` writing to the source field', () => {
    expect(
      stepWritesOrRemovesField({ action: 'set', to: sourceField, value: 'redacted' }, sourceField)
    ).toBe(true);
  });

  it('detects `remove` against the source field', () => {
    expect(stepWritesOrRemovesField({ action: 'remove', from: sourceField }, sourceField)).toBe(
      true
    );
  });

  it('detects `rename` away from the source field', () => {
    expect(
      stepWritesOrRemovesField(
        { action: 'rename', from: sourceField, to: 'attributes.original_message' },
        sourceField
      )
    ).toBe(true);
  });

  it('detects `convert` writing back into the source field via `to`', () => {
    expect(
      stepWritesOrRemovesField(
        { action: 'convert', from: 'attributes.raw', to: sourceField, type: 'string' },
        sourceField
      )
    ).toBe(true);
  });

  it('returns false for an unrelated `set`', () => {
    expect(
      stepWritesOrRemovesField(
        { action: 'set', to: 'attributes.environment', value: 'prod' },
        sourceField
      )
    ).toBe(false);
  });

  it('returns false for grok reading the source field (read-only, safe to keep before)', () => {
    expect(
      stepWritesOrRemovesField({ action: 'grok', from: sourceField, patterns: ['x'] }, sourceField)
    ).toBe(false);
  });

  it('returns false for non-objects', () => {
    expect(stepWritesOrRemovesField(null, sourceField)).toBe(false);
    expect(stepWritesOrRemovesField('grok', sourceField)).toBe(false);
  });
});

describe('buildKeyValueHints', () => {
  // The hint generator only flags fields where every populated sample value
  // shares an identical `prefix=` shape, since false positives lead the agent
  // to suggest unwanted refinements.
  const docs = (...rows: Array<Record<string, unknown>>): FlattenRecord[] =>
    rows as FlattenRecord[];

  it('returns no hints below the minimum sample threshold', () => {
    // KV_MIN_SAMPLES is 5; four populated values is not enough.
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.user.id': 'user=u-3' },
        { 'attributes.user.id': 'user=u-4' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('emits a hint when every sample value shares the same `prefix=` shape', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.user.id': 'user=u-3' },
        { 'attributes.user.id': 'user=u-4' },
        { 'attributes.user.id': 'user=u-5' }
      )
    );

    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain('attributes.user.id');
    expect(hints[0]).toContain('user=');
    expect(hints[0]).toContain('extract_fields: false');
  });

  it('does NOT emit a hint when only some values carry the prefix', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.user.id': 'plain-value' },
        { 'attributes.user.id': 'user=u-4' },
        { 'attributes.user.id': 'user=u-5' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('does NOT emit a hint when prefixes differ between samples', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'attributes.id': 'user=u-1' },
        { 'attributes.id': 'service=auth' },
        { 'attributes.id': 'user=u-3' },
        { 'attributes.id': 'service=catalog' },
        { 'attributes.id': 'user=u-5' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('skips system fields on the blocklist (body.text, message, @timestamp, stream.name)', () => {
    const hints = buildKeyValueHints(
      docs(
        { 'body.text': 'user=u-1', message: 'service=auth' },
        { 'body.text': 'user=u-2', message: 'service=auth' },
        { 'body.text': 'user=u-3', message: 'service=auth' },
        { 'body.text': 'user=u-4', message: 'service=auth' },
        { 'body.text': 'user=u-5', message: 'service=auth' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' },
        { '@timestamp': 'k=v', 'stream.name': 'k=v' }
      )
    );
    expect(hints).toEqual([]);
  });

  it('emits a separate hint per qualifying field', () => {
    const sample = (i: number) => ({
      'attributes.user.id': `user=u-${i}`,
      'resource.attributes.service.name': `service=svc-${i}`,
    });
    const hints = buildKeyValueHints(docs(sample(1), sample(2), sample(3), sample(4), sample(5)));

    expect(hints).toHaveLength(2);
    expect(hints.some((h) => h.includes('attributes.user.id') && h.includes('user='))).toBe(true);
    expect(
      hints.some((h) => h.includes('resource.attributes.service.name') && h.includes('service='))
    ).toBe(true);
  });
});

describe('runExtractFieldsFlow', () => {
  // Builds a minimal dep set that lets the function reach the
  // `Streams.ingest.all.Definition.is` early return without any extraction
  // workers, inference clients, or telemetry being touched. Each test
  // overrides `streamsClient.getStream` to control the path under test.
  const buildDeps = (overrides: Partial<RunExtractFieldsDeps> = {}): RunExtractFieldsDeps => {
    const noopLogger = {
      get: () => noopLogger,
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      log: jest.fn(),
      isLevelEnabled: () => true,
    } as unknown as RunExtractFieldsDeps['logger'];

    return {
      streamsClient: {
        getStream: jest.fn(),
      } as unknown as RunExtractFieldsDeps['streamsClient'],
      scopedClusterClient: {
        asCurrentUser: { search: jest.fn() },
      } as unknown as RunExtractFieldsDeps['scopedClusterClient'],
      inferenceClient: {} as RunExtractFieldsDeps['inferenceClient'],
      boundInferenceClient: {} as RunExtractFieldsDeps['boundInferenceClient'],
      connectorId: 'test-connector',
      fieldsMetadataClient: {} as RunExtractFieldsDeps['fieldsMetadataClient'],
      patternExtractionService: {} as RunExtractFieldsDeps['patternExtractionService'],
      telemetry: {
        trackProcessingPipelineSuggested: jest.fn(),
      } as unknown as RunExtractFieldsDeps['telemetry'],
      logger: noopLogger,
      ...overrides,
    };
  };

  it('returns `unsupported` for a non-ingest stream (e.g. query stream)', async () => {
    const deps = buildDeps();
    // Query streams have `type: 'query'` and fail
    // `Streams.ingest.all.Definition.is`. They need a graceful fallback rather
    // than an opaque error so the agent can surface the reason.
    (deps.streamsClient.getStream as jest.Mock).mockResolvedValue({
      name: 'logs.errors-view',
      type: 'query',
      query: { view: 'logs.errors-view', esql: 'FROM logs* | WHERE log.level == "error"' },
    });

    const outcome = await runExtractFieldsFlow({ streamName: 'logs.errors-view' }, deps);

    expect(outcome.kind).toBe('unsupported');
    if (outcome.kind === 'unsupported') {
      expect(outcome.result.steps).toEqual([]);
      expect(outcome.result.warnings).toContainEqual(
        expect.stringContaining('extract_fields is only supported for ingest streams')
      );
      expect(outcome.result.simulation.success_rate).toBeNull();
    }
    expect(deps.telemetry.trackProcessingPipelineSuggested).not.toHaveBeenCalled();
  });

  it('returns `fallback` with reason `no_samples` when sample resolution yields no documents', async () => {
    const deps = buildDeps();
    // Wired ingest stream with a valid definition but the index is empty.
    (deps.streamsClient.getStream as jest.Mock).mockResolvedValue({
      type: 'wired',
      name: 'logs.test_unstructured',
      description: 'Empty stream',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [] },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        settings: {},
      },
    });
    (deps.scopedClusterClient.asCurrentUser.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    const outcome = await runExtractFieldsFlow({ streamName: 'logs.test_unstructured' }, deps);

    expect(outcome.kind).toBe('fallback');
    if (outcome.kind === 'fallback') {
      expect(outcome.reason).toBe('no_samples');
    }
  });

  it('returns `fallback` with reason `no_text_field` when samples have no parseable text field', async () => {
    const deps = buildDeps();
    (deps.streamsClient.getStream as jest.Mock).mockResolvedValue({
      type: 'wired',
      name: 'logs.test_structured',
      description: 'Structured stream',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [] },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        settings: {},
      },
    });
    // Documents are already structured — no `body.text` or `message` for the
    // heuristic to seed-parse from.
    (deps.scopedClusterClient.asCurrentUser.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          { _source: { '@timestamp': '2026-04-16T00:00:00Z', 'service.name': 'auth' } },
          { _source: { '@timestamp': '2026-04-16T00:01:00Z', 'service.name': 'auth' } },
        ],
      },
    });

    const outcome = await runExtractFieldsFlow({ streamName: 'logs.test_structured' }, deps);

    expect(outcome.kind).toBe('fallback');
    if (outcome.kind === 'fallback') {
      expect(outcome.reason).toBe('no_text_field');
    }
  });

  // ---------------------------------------------------------------------
  // Success / late-fallback paths
  //
  // These tests exercise the orchestration that runs after both
  // `body.text` discovery and `extractMessagesFromField` succeed: parallel
  // grok+dissect candidate selection, post-parse sub-agent design, merge
  // placement (append vs prepend), conflict warnings, drop warnings, and
  // telemetry.
  // ---------------------------------------------------------------------
  describe('after extraction starts', () => {
    const ingestStreamName = 'logs.unstructured';

    const buildIngestStreamDef = (
      processingSteps: StreamlangStep[] = []
    ): {
      type: 'wired';
      name: string;
      description: string;
      ingest: {
        wired: { fields: Record<string, never>; routing: never[] };
        processing: { steps: StreamlangStep[] };
        lifecycle: { inherit: {} };
        failure_store: { inherit: {} };
        settings: {};
      };
    } => ({
      type: 'wired',
      name: ingestStreamName,
      description: '',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: processingSteps },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        settings: {},
      },
    });

    const sampleSearchResponse = {
      hits: {
        hits: [
          { _source: { 'body.text': '192.168.1.1 GET / 200', 'service.name': 'web' } },
          { _source: { 'body.text': '10.0.0.1 POST /login 401', 'service.name': 'web' } },
        ],
      },
    };

    const grokCandidateProcessor: GrokProcessor = {
      action: 'grok',
      from: 'body.text',
      patterns: [
        '%{IP:attributes.source.ip} %{WORD:attributes.method} %{URIPATHPARAM:attributes.path} %{NUMBER:attributes.status}',
      ],
    } as unknown as GrokProcessor;

    const succeededSimulation = (
      overrides: Partial<ProcessingSimulationResponse> = {}
    ): ProcessingSimulationResponse =>
      ({
        detected_fields: [{ name: 'attributes.source.ip', esType: 'ip' }],
        documents: [
          {
            detected_fields: [],
            errors: [],
            status: 'parsed',
            processed_by: [],
            value: { 'attributes.source.ip': '192.168.1.1' },
          },
        ],
        processors_metrics: {},
        definition_error: undefined,
        documents_metrics: {
          failed_rate: 0,
          partially_parsed_rate: 0,
          skipped_rate: 0,
          parsed_rate: 1,
          dropped_rate: 0,
        },
        ...overrides,
      } as ProcessingSimulationResponse);

    beforeEach(() => {
      mockProcessGrokPatterns.mockReset();
      mockProcessDissectPattern.mockReset();
      mockExtractParsedSampleDocuments.mockReset();
      mockSuggestProcessingPipeline.mockReset();
      mockMergeSeedParsingProcessorIntoSuggestedPipeline.mockReset();
      mockBuildDocumentStructureOverviewForPipelinePrompt.mockReset();
      mockFormatUpstreamSeedParsingContextForPromptMarkdown.mockReset();
      mockFetchMappedFieldsForStreamProcessingSuggestions.mockReset();
      mockSimulateProcessing.mockReset();

      // Sensible defaults — individual tests override what they care about.
      mockBuildDocumentStructureOverviewForPipelinePrompt.mockResolvedValue({} as never);
      mockFormatUpstreamSeedParsingContextForPromptMarkdown.mockReturnValue('seed context');
      mockFetchMappedFieldsForStreamProcessingSuggestions.mockResolvedValue({});
      mockMergeSeedParsingProcessorIntoSuggestedPipeline.mockImplementation(
        (seedProcessor, agentSuggestion) =>
          ({
            steps: [seedProcessor as unknown as StreamlangStep, ...agentSuggestion.steps],
          } as never)
      );
    });

    const arrangeStreamWithSamples = (
      deps: RunExtractFieldsDeps,
      processingSteps: StreamlangStep[] = []
    ) => {
      (deps.streamsClient.getStream as jest.Mock).mockResolvedValue(
        buildIngestStreamDef(processingSteps)
      );
      (deps.scopedClusterClient.asCurrentUser.search as jest.Mock).mockResolvedValue(
        sampleSearchResponse
      );
    };

    it('returns `fallback` with reason `no_candidate` when both grok and dissect produce nothing', async () => {
      // Both heuristics returning `null` is the "we tried, nothing useful
      // came back" signal — extract_fields cannot proceed without a seed
      // pattern, so the tool falls back to LLM-only design.
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue(null);
      mockProcessDissectPattern.mockResolvedValue(null);

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('fallback');
      if (outcome.kind === 'fallback') {
        expect(outcome.reason).toBe('no_candidate');
      }
      // Tracked even on fallback so we can measure how often heuristics
      // give up — but with `success: false`.
      expect(deps.telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, source: 'agent', stream_name: ingestStreamName })
      );
    });

    it('returns `fallback` with reason `no_parsed_documents` when seed simulation produces no parsed docs', async () => {
      // The chosen seed pattern compiled fine, but applied against the
      // sample documents it parsed nothing. Continuing into the post-parse
      // sub-agent would feed the LLM zero fully-parsed samples — falling
      // back is correct.
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.5,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [],
        definitionError: false,
      });

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('fallback');
      if (outcome.kind === 'fallback') {
        expect(outcome.reason).toBe('no_parsed_documents');
      }
    });

    it('returns `fallback` with reason `no_parsed_documents` when seed simulation reports a definition error', async () => {
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.5,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [],
        definitionError: true,
      });

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('fallback');
      if (outcome.kind === 'fallback') {
        expect(outcome.reason).toBe('no_parsed_documents');
      }
    });

    it('picks the highest `parsedRate` candidate when both grok and dissect succeed', async () => {
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      const dissectProcessor = {
        action: 'dissect',
        from: 'body.text',
        pattern: '%{ip} %{rest}',
      } as unknown as StreamlangStep;
      // Dissect has the higher rate — it must win.
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.4,
      });
      mockProcessDissectPattern.mockResolvedValue({
        type: 'dissect',
        processor: dissectProcessor as never,
        parsedRate: 0.9,
      });
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      // The processor passed into `extractParsedSampleDocuments` is the
      // winning candidate. Asserting on `parsingProcessor` lets us
      // verify the sort ran on `parsedRate` (descending).
      expect(mockExtractParsedSampleDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ parsingProcessor: dissectProcessor })
      );
    });

    it('returns `success` with appended new extraction when no existing step touches the source field', async () => {
      // Existing steps decorate `attributes.environment` and don't touch
      // `body.text` — so it's safe to keep them at their original position
      // and append the discovered grok/dissect at the end.
      const harmlessExistingStep = {
        action: 'set',
        to: 'attributes.environment',
        value: 'prod',
        ignore_failure: true,
      } as unknown as StreamlangStep;

      const deps = buildDeps();
      arrangeStreamWithSamples(deps, [harmlessExistingStep]);

      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.95,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: {
          steps: [
            {
              action: 'date',
              from: 'attributes.timestamp',
              to: '@timestamp',
              formats: ['ISO8601'],
            } as unknown as StreamlangStep,
          ],
        },
        metadata: { stepsUsed: 3, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        // Existing step kept at index 0, new extraction (seed grok + agent
        // suggestion) appended after.
        const firstStep = outcome.result.steps[0] as { action?: string; to?: string };
        expect(firstStep.action).toBe('set');
        expect(firstStep.to).toBe('attributes.environment');
        // existing_steps is the pre-existing pipeline, unchanged.
        expect(outcome.result.existing_steps).toHaveLength(1);
        // Placement warning explicitly says the existing step kept its
        // original position so the user can verify nothing was reordered.
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('kept their original position')])
        );
      }

      expect(deps.telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          source: 'agent',
          stream_name: ingestStreamName,
          steps_used: 3,
        })
      );
    });

    it('returns `success` and PREPENDS new extraction when an existing step writes to the source field', async () => {
      // The existing `set` writes back into `body.text` BEFORE the new
      // grok would run — letting the existing step keep its position
      // would mutate the source the heuristic extracts from. The merge
      // logic must detect this and place new extraction first.
      const writesBodyText = {
        action: 'set',
        to: 'body.text',
        value: 'redacted',
        ignore_failure: true,
      } as unknown as StreamlangStep;

      const deps = buildDeps();
      arrangeStreamWithSamples(deps, [writesBodyText]);

      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.95,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        // First step in the merged pipeline is the seed grok, NOT the
        // pre-existing `set` — extraction runs first now.
        const firstStep = outcome.result.steps[0] as { action?: string };
        expect(firstStep.action).toBe('grok');
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('New extraction was placed BEFORE')])
        );
      }
    });

    it('emits a duplication warning when an existing step already extracts from the same field', async () => {
      // The user already has a grok against `body.text`. The new
      // extraction may produce overlapping captures — the agent must
      // surface this so the user confirms before applying.
      const existingGrok = {
        action: 'grok',
        from: 'body.text',
        patterns: ['%{IP:attributes.original_ip}'],
        ignore_failure: true,
      } as unknown as StreamlangStep;

      const deps = buildDeps();
      arrangeStreamWithSamples(deps, [existingGrok]);

      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.95,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([
            expect.stringContaining('already extracts from field "body.text"'),
          ])
        );
      }
    });

    it('surfaces simulation errors as a warning with the success rate prefix', async () => {
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.5,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      // Simulation reports half the docs failed with a known error.
      mockSimulateProcessing.mockResolvedValue(
        succeededSimulation({
          documents: [
            {
              detected_fields: [],
              errors: [],
              status: 'parsed',
              processed_by: [],
              value: { 'attributes.source.ip': '1.2.3.4' },
            },
            {
              detected_fields: [],
              errors: [
                {
                  type: 'generic_processor_failure',
                  processor_id: 'p1',
                  message: 'grok pattern did not match',
                },
              ],
              status: 'failed',
              processed_by: [],
              value: {},
            },
          ],
          documents_metrics: {
            failed_rate: 0.5,
            partially_parsed_rate: 0,
            skipped_rate: 0,
            parsed_rate: 0.5,
            dropped_rate: 0,
          },
        })
      );

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.simulation.success_rate).toBe(50);
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('50% success rate with 1 error type(s)')])
        );
      }
    });

    it('treats a definition error in the final simulation as null success_rate with the message surfaced', async () => {
      // A definition error means the proposed pipeline could not be
      // compiled at all — no per-doc success rate is meaningful.
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 0.5,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: { steps: [] },
        metadata: { stepsUsed: 1, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(
        succeededSimulation({
          definition_error: {
            type: 'generic_simulation_failure',
            message: 'reserved field cannot be written',
          },
          documents: [],
          documents_metrics: {
            failed_rate: 0,
            partially_parsed_rate: 0,
            skipped_rate: 0,
            parsed_rate: 0,
            dropped_rate: 0,
          },
        })
      );

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.simulation.success_rate).toBeNull();
        expect(outcome.result.field_changes).toEqual([]);
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('reserved field cannot be written')])
        );
      }
    });

    // ---------------------------------------------------------------------
    // Simulation strategy
    //
    // When the user already has a pipeline AND the sample documents reflect
    // its output (the default for samples.source === 'stream', or inline
    // samples explicitly tagged status === 'processed'), re-running the
    // existing steps on top of already-processed data would mis-classify
    // already-typed values as processor failures. The handler must mirror
    // `nl_to_streamlang.ts::determineSimulationStrategy` and simulate only
    // the newly-added prefix in that case.
    // ---------------------------------------------------------------------
    describe('simulation strategy', () => {
      const arrangeWinningCandidate = (deps: RunExtractFieldsDeps) => {
        mockProcessGrokPatterns.mockResolvedValue({
          type: 'grok',
          processor: grokCandidateProcessor,
          parsedRate: 1,
        });
        mockProcessDissectPattern.mockResolvedValue(null);
        mockExtractParsedSampleDocuments.mockResolvedValue({
          parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
          definitionError: false,
        });
        // Sub-agent contributes one extra step so we can verify both the
        // seed and the sub-agent step are part of the simulated subset.
        mockSuggestProcessingPipeline.mockResolvedValue({
          pipeline: {
            steps: [
              {
                action: 'date',
                from: 'attributes.timestamp',
                to: '@timestamp',
                formats: ['ISO8601'],
              } as unknown as StreamlangStep,
            ],
          },
          metadata: { stepsUsed: 2, maxSteps: 6 },
        });
        mockSimulateProcessing.mockResolvedValue(succeededSimulation());
      };

      it('uses partial mode and simulates only the newly-added steps when an existing pipeline is preserved (stream samples are processed)', async () => {
        const harmlessExistingStep = {
          action: 'set',
          to: 'attributes.environment',
          value: 'prod',
          ignore_failure: true,
        } as unknown as StreamlangStep;

        const deps = buildDeps();
        arrangeStreamWithSamples(deps, [harmlessExistingStep]);
        arrangeWinningCandidate(deps);

        const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

        expect(outcome.kind).toBe('success');
        if (outcome.kind !== 'success') return;

        expect(outcome.result.simulation.mode).toBe('partial');

        // Final simulator call must NOT include the existing `set` step —
        // that would re-run it on already-processed docs and produce
        // misleading failures.
        const simCalls = mockSimulateProcessing.mock.calls;
        const finalCall = simCalls[simCalls.length - 1][0];
        const simulatedActions = (
          finalCall.params.body.processing.steps as Array<{ action?: string }>
        ).map((s) => s.action);
        expect(simulatedActions).not.toContain('set');
        expect(simulatedActions).toEqual(expect.arrayContaining(['grok', 'date']));

        // A user-visible warning explains the partial nature of the result.
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('Simulation is partial')])
        );
      });

      it('uses complete mode and simulates the full proposed pipeline when there are no existing steps', async () => {
        const deps = buildDeps();
        arrangeStreamWithSamples(deps, []);
        arrangeWinningCandidate(deps);

        const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

        expect(outcome.kind).toBe('success');
        if (outcome.kind !== 'success') return;

        expect(outcome.result.simulation.mode).toBe('complete');
        expect(outcome.result.warnings ?? []).not.toEqual(
          expect.arrayContaining([expect.stringContaining('Simulation is partial')])
        );
      });

      it('uses complete mode and simulates the full pipeline for inline `unprocessed` samples even with existing steps', async () => {
        // Unprocessed inline samples are raw inputs, so re-running the full
        // pipeline (existing + new) is the accurate simulation.
        const harmlessExistingStep = {
          action: 'set',
          to: 'attributes.environment',
          value: 'prod',
          ignore_failure: true,
        } as unknown as StreamlangStep;

        const deps = buildDeps();
        (deps.streamsClient.getStream as jest.Mock).mockResolvedValue(
          buildIngestStreamDef([harmlessExistingStep])
        );
        arrangeWinningCandidate(deps);

        const outcome = await runExtractFieldsFlow(
          {
            streamName: ingestStreamName,
            samples: {
              source: 'inline',
              status: 'unprocessed',
              documents: [
                { 'body.text': '192.168.1.1 GET / 200', 'service.name': 'web' },
                { 'body.text': '10.0.0.1 POST /login 401', 'service.name': 'web' },
              ],
            },
          },
          deps
        );

        expect(outcome.kind).toBe('success');
        if (outcome.kind !== 'success') return;

        expect(outcome.result.simulation.mode).toBe('complete');

        // Full merged pipeline (existing `set` + new `grok` + sub-agent `date`)
        // must reach the simulator since the docs are raw.
        const simCalls = mockSimulateProcessing.mock.calls;
        const finalCall = simCalls[simCalls.length - 1][0];
        const simulatedActions = (
          finalCall.params.body.processing.steps as Array<{ action?: string }>
        ).map((s) => s.action);
        expect(simulatedActions).toEqual(expect.arrayContaining(['set', 'grok', 'date']));
      });

      it('emits a stronger partial-simulation warning when an existing step writes to or removes the source field', async () => {
        // Prepend case: the cached samples were captured AFTER the existing
        // step mutated the source, so partial simulation will under-report
        // success. The warning makes that explicit.
        const writesBodyText = {
          action: 'set',
          to: 'body.text',
          value: 'redacted',
          ignore_failure: true,
        } as unknown as StreamlangStep;

        const deps = buildDeps();
        arrangeStreamWithSamples(deps, [writesBodyText]);
        arrangeWinningCandidate(deps);

        const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

        expect(outcome.kind).toBe('success');
        if (outcome.kind !== 'success') return;

        expect(outcome.result.simulation.mode).toBe('partial');
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([
            expect.stringContaining('cached samples may have already been mutated'),
          ])
        );
      });
    });

    it('emits a warning when the post-parse sub-agent contributes no additional steps', async () => {
      const deps = buildDeps();
      arrangeStreamWithSamples(deps);
      mockProcessGrokPatterns.mockResolvedValue({
        type: 'grok',
        processor: grokCandidateProcessor,
        parsedRate: 1,
      });
      mockProcessDissectPattern.mockResolvedValue(null);
      mockExtractParsedSampleDocuments.mockResolvedValue({
        parsedDocuments: [{ 'body.text': '...' } as FlattenRecord],
        definitionError: false,
      });
      // Sub-agent produced no follow-up steps — the pipeline contains
      // only the heuristic seed step.
      mockSuggestProcessingPipeline.mockResolvedValue({
        pipeline: null,
        metadata: { stepsUsed: 0, maxSteps: 6 },
      });
      mockSimulateProcessing.mockResolvedValue(succeededSimulation());

      const outcome = await runExtractFieldsFlow({ streamName: ingestStreamName }, deps);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.warnings).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Post-parse design produced no additional steps'),
          ])
        );
      }
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { NlToStreamlangResult } from './nl_to_streamlang';
import type { RunExtractFieldsOutcome } from './extract_fields_handler';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { IPatternExtractionService } from '../../../lib/pattern_extraction/pattern_extraction_service';

// `design_pipeline` is a thin orchestration over two underlying engines —
// the LLM-only `nlToStreamlang` and the heuristic `runExtractFieldsFlow`.
// We mock both so each test asserts on the orchestrator alone (which path
// it picks, how it handles outcomes, how it merges hints, etc.).
jest.mock('./nl_to_streamlang', () => ({
  nlToStreamlang: jest.fn(),
}));
jest.mock('./extract_fields_handler', () => ({
  runExtractFieldsFlow: jest.fn(),
}));

import { createDesignPipelineTool } from './design_pipeline';
import { nlToStreamlang } from './nl_to_streamlang';
import { runExtractFieldsFlow } from './extract_fields_handler';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';

const mockNlToStreamlang = nlToStreamlang as jest.MockedFunction<typeof nlToStreamlang>;
const mockRunExtractFieldsFlow = runExtractFieldsFlow as jest.MockedFunction<
  typeof runExtractFieldsFlow
>;

const buildNlToStreamlangResult = (
  overrides: Partial<NlToStreamlangResult> = {}
): NlToStreamlangResult => ({
  steps: [{ action: 'remove', from: 'message' } as never],
  existing_steps: [],
  step_changes: [],
  summary: 'remove: message',
  field_changes: [],
  simulation: { success_rate: 100, sample_count: 5, mode: 'complete' },
  samples_info: { source: 'stream', count: 5 },
  ...overrides,
});

describe('createDesignPipelineTool', () => {
  const setup = (options: { patternExtractionService?: IPatternExtractionService } = {}) => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    streamsClient.getStream.mockResolvedValue({
      type: 'wired',
      name: 'logs.test',
      description: '',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [] },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        settings: {},
      },
    } as never);
    const telemetry = {
      trackProcessingPipelineSuggested: jest.fn(),
    } as unknown as EbtTelemetryClient;
    const tool = createDesignPipelineTool({
      getScopedClients,
      patternExtractionService: options.patternExtractionService,
      logger: loggerMock.create(),
      telemetry,
    });
    const context = createMockToolContext();
    return { tool, context, streamsClient, telemetry };
  };

  beforeEach(() => {
    mockNlToStreamlang.mockReset();
    mockRunExtractFieldsFlow.mockReset();
  });

  describe('extract_fields: false (or omitted) — LLM-only path', () => {
    it('routes to nlToStreamlang and wraps the result with status + note', async () => {
      const { tool, context } = setup();
      mockNlToStreamlang.mockResolvedValue(buildNlToStreamlangResult());

      const result = await tool.handler(
        { stream_name: 'logs.test', instruction: 'remove message' },
        context
      );

      expect(mockNlToStreamlang).toHaveBeenCalledTimes(1);
      expect(mockRunExtractFieldsFlow).not.toHaveBeenCalled();

      if (!('results' in result)) throw new Error('Expected results return');
      const data = result.results[0].data as Record<string, unknown>;
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(data.status).toBe('proposal_not_applied');
      expect(data.stream).toBe('logs.test');
      expect(data.note).toEqual(expect.stringContaining('proposed pipeline change'));
      // The full nlToStreamlang result is spread into the response (steps,
      // simulation, samples_info, …) so the agent has everything to
      // present to the user.
      expect(data).toHaveProperty('steps');
      expect(data).toHaveProperty('simulation');
    });

    it('forwards the inline-samples payload through to nlToStreamlang verbatim', async () => {
      const { tool, context } = setup();
      mockNlToStreamlang.mockResolvedValue(buildNlToStreamlangResult());

      const samples = {
        source: 'inline' as const,
        documents: [{ message: 'x' }],
        status: 'unprocessed' as const,
      };

      await tool.handler(
        { stream_name: 'logs.test', instruction: 'remove message', samples },
        context
      );

      expect(mockNlToStreamlang).toHaveBeenCalledWith(
        expect.objectContaining({ samples }),
        expect.anything()
      );
    });
  });

  describe('extract_fields: true — heuristic path', () => {
    it('returns the heuristic result on `kind: "success"` without falling back to LLM', async () => {
      const { tool, context } = setup({
        patternExtractionService: {} as IPatternExtractionService,
      });
      const heuristicResult = buildNlToStreamlangResult({
        steps: [{ action: 'grok', from: 'body.text', patterns: ['%{IP:ip}'] } as never],
        summary: 'grok: body.text',
        hints: [
          'Seed parsing was discovered automatically using grok heuristics on field "body.text".',
        ],
      });
      mockRunExtractFieldsFlow.mockResolvedValue({
        kind: 'success',
        streamType: 'wired',
        stepsUsed: 4,
        result: heuristicResult,
      });

      const result = await tool.handler(
        { stream_name: 'logs.test', instruction: 'parse this stream', extract_fields: true },
        context
      );

      expect(mockRunExtractFieldsFlow).toHaveBeenCalledTimes(1);
      // No LLM-only fallback when heuristics produced a usable pipeline.
      expect(mockNlToStreamlang).not.toHaveBeenCalled();

      if (!('results' in result)) throw new Error('Expected results return');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.status).toBe('proposal_not_applied');
      expect(data.summary).toBe('grok: body.text');
      expect(data.hints).toEqual(
        expect.arrayContaining([expect.stringContaining('Seed parsing was discovered')])
      );
    });

    it('returns the heuristic result on `kind: "unsupported"` (e.g. query stream) without falling back', async () => {
      // `unsupported` carries a typed warning explaining why the path did
      // not run. The orchestrator must surface that to the agent rather
      // than silently retrying via the LLM, which would produce a misleading
      // pipeline.
      const { tool, context } = setup({
        patternExtractionService: {} as IPatternExtractionService,
      });
      mockRunExtractFieldsFlow.mockResolvedValue({
        kind: 'unsupported',
        streamType: 'query',
        result: buildNlToStreamlangResult({
          steps: [],
          warnings: ['extract_fields is only supported for ingest streams'],
        }),
      });

      const result = await tool.handler(
        {
          stream_name: 'logs.errors-view',
          instruction: 'parse this',
          extract_fields: true,
        },
        context
      );

      expect(mockRunExtractFieldsFlow).toHaveBeenCalledTimes(1);
      expect(mockNlToStreamlang).not.toHaveBeenCalled();
      if (!('results' in result)) throw new Error('Expected results return');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('only supported for ingest streams')])
      );
    });

    it('falls back to nlToStreamlang and prepends a fallback hint on `kind: "fallback"`', async () => {
      const { tool, context } = setup({
        patternExtractionService: {} as IPatternExtractionService,
      });
      const fallback: RunExtractFieldsOutcome = {
        kind: 'fallback',
        reason: 'no_candidate',
        streamType: 'wired',
      };
      mockRunExtractFieldsFlow.mockResolvedValue(fallback);
      mockNlToStreamlang.mockResolvedValue(buildNlToStreamlangResult({ hints: ['llm hint'] }));

      const result = await tool.handler(
        { stream_name: 'logs.test', instruction: 'parse this stream', extract_fields: true },
        context
      );

      expect(mockRunExtractFieldsFlow).toHaveBeenCalledTimes(1);
      expect(mockNlToStreamlang).toHaveBeenCalledTimes(1);

      if (!('results' in result)) throw new Error('Expected results return');
      const data = result.results[0].data as { hints?: string[] };
      // The fallback reason MUST be merged in front of the LLM's own
      // hints so the user can see the heuristic path was attempted but
      // produced no usable seed.
      expect(data.hints?.[0]).toEqual(
        expect.stringContaining('Heuristic field extraction did not yield a usable seed pattern')
      );
      expect(data.hints?.[0]).toEqual(expect.stringContaining('no_candidate'));
      expect(data.hints).toContain('llm hint');
    });

    it('falls back to LLM-only with a hint when patternExtractionService is not available', async () => {
      // Stateless / serverless environments may not have the heuristic
      // worker pool. The tool must degrade gracefully instead of throwing,
      // and surface to the user that the heuristic path was unavailable.
      const { tool, context } = setup(); // no patternExtractionService

      mockNlToStreamlang.mockResolvedValue(buildNlToStreamlangResult({ hints: [] }));

      const result = await tool.handler(
        { stream_name: 'logs.test', instruction: 'parse this stream', extract_fields: true },
        context
      );

      // Heuristic flow is never called when there's no service.
      expect(mockRunExtractFieldsFlow).not.toHaveBeenCalled();
      expect(mockNlToStreamlang).toHaveBeenCalledTimes(1);

      if (!('results' in result)) throw new Error('Expected results return');
      const data = result.results[0].data as { hints?: string[] };
      expect(data.hints).toEqual(
        expect.arrayContaining([
          expect.stringContaining('heuristic pattern extraction is not available'),
        ])
      );
    });
  });

  describe('error handling', () => {
    it('wraps unexpected errors from nlToStreamlang in a typed tool error', async () => {
      const { tool, context } = setup();
      mockNlToStreamlang.mockRejectedValue(new Error('LLM connector unavailable'));

      const result = await tool.handler(
        { stream_name: 'logs.test', instruction: 'remove message' },
        context
      );

      if (!('results' in result)) throw new Error('Expected results return');
      expect(result.results[0].type).toBe(ToolResultType.error);
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.operation).toBe('design_pipeline');
      expect(data.stream).toBe('logs.test');
      expect(data.message).toEqual(expect.stringContaining('LLM connector unavailable'));
    });

    it('wraps unexpected errors from runExtractFieldsFlow in a typed tool error', async () => {
      const { tool, context } = setup({
        patternExtractionService: {} as IPatternExtractionService,
      });
      mockRunExtractFieldsFlow.mockRejectedValue(new Error('worker pool exhausted'));

      const result = await tool.handler(
        { stream_name: 'logs.test', instruction: 'parse this stream', extract_fields: true },
        context
      );

      if (!('results' in result)) throw new Error('Expected results return');
      expect(result.results[0].type).toBe(ToolResultType.error);
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.operation).toBe('design_pipeline');
      expect(data.message).toEqual(expect.stringContaining('worker pool exhausted'));
      // The error path must NOT silently fall back to nlToStreamlang —
      // we want the failure to be visible.
      expect(mockNlToStreamlang).not.toHaveBeenCalled();
    });
  });

  describe('telemetry', () => {
    it('emits flow=nl_to_streamlang on the LLM-only path (extract_fields omitted)', async () => {
      const { tool, context, telemetry, streamsClient } = setup();
      mockNlToStreamlang.mockResolvedValue(buildNlToStreamlangResult());

      await tool.handler({ stream_name: 'logs.test', instruction: 'remove message' }, context);

      // The LLM path does not surface the stream type, so the handler
      // performs one `getStream` call solely to populate `stream_type`.
      expect(streamsClient.getStream).toHaveBeenCalledWith('logs.test');
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'agent',
          flow: 'nl_to_streamlang',
          success: true,
          steps_used: 0,
          stream_name: 'logs.test',
          stream_type: 'wired',
        })
      );
      // No fallback reason on the direct LLM path.
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.not.objectContaining({ extract_fields_fallback_reason: expect.anything() })
      );
    });

    it('emits flow=extract_fields with stepsUsed when the heuristic path returns success', async () => {
      const { tool, context, telemetry, streamsClient } = setup({
        patternExtractionService: {} as IPatternExtractionService,
      });
      mockRunExtractFieldsFlow.mockResolvedValue({
        kind: 'success',
        streamType: 'classic',
        stepsUsed: 5,
        result: buildNlToStreamlangResult(),
      });

      await tool.handler(
        { stream_name: 'logs.test', instruction: 'parse this stream', extract_fields: true },
        context
      );

      // The heuristic outcome surfaces `streamType` directly, so no extra
      // `getStream` round-trip is needed for telemetry.
      expect(streamsClient.getStream).not.toHaveBeenCalled();
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'agent',
          flow: 'extract_fields',
          success: true,
          steps_used: 5,
          stream_type: 'classic',
        })
      );
    });

    it('emits flow=extract_fields, success=true on the unsupported branch (tool did not throw)', async () => {
      const { tool, context, telemetry } = setup({
        patternExtractionService: {} as IPatternExtractionService,
      });
      mockRunExtractFieldsFlow.mockResolvedValue({
        kind: 'unsupported',
        streamType: 'query',
        result: buildNlToStreamlangResult({ steps: [] }),
      });

      await tool.handler(
        { stream_name: 'logs.errors-view', instruction: 'parse', extract_fields: true },
        context
      );

      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: 'extract_fields',
          success: true,
          steps_used: 0,
          stream_type: 'query',
        })
      );
    });

    it('emits flow=nl_to_streamlang with extract_fields_fallback_reason when heuristics return fallback', async () => {
      const { tool, context, telemetry, streamsClient } = setup({
        patternExtractionService: {} as IPatternExtractionService,
      });
      mockRunExtractFieldsFlow.mockResolvedValue({
        kind: 'fallback',
        reason: 'no_candidate',
        streamType: 'wired',
      });
      mockNlToStreamlang.mockResolvedValue(buildNlToStreamlangResult());

      await tool.handler(
        { stream_name: 'logs.test', instruction: 'parse this stream', extract_fields: true },
        context
      );

      // Stream type was already resolved by the heuristic outcome — no
      // second `getStream` call should fire on the fallback path.
      expect(streamsClient.getStream).not.toHaveBeenCalled();
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: 'nl_to_streamlang',
          success: true,
          stream_type: 'wired',
          extract_fields_fallback_reason: 'no_candidate',
        })
      );
    });

    it('emits flow=nl_to_streamlang with fallback_reason=service_unavailable when patternExtractionService is missing', async () => {
      const { tool, context, telemetry } = setup(); // no patternExtractionService
      mockNlToStreamlang.mockResolvedValue(buildNlToStreamlangResult());

      await tool.handler(
        { stream_name: 'logs.test', instruction: 'parse this stream', extract_fields: true },
        context
      );

      expect(mockRunExtractFieldsFlow).not.toHaveBeenCalled();
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: 'nl_to_streamlang',
          success: true,
          extract_fields_fallback_reason: 'service_unavailable',
        })
      );
    });

    it('emits success=false on the LLM-only path when nlToStreamlang throws', async () => {
      const { tool, context, telemetry } = setup();
      mockNlToStreamlang.mockRejectedValue(new Error('connector unavailable'));

      await tool.handler({ stream_name: 'logs.test', instruction: 'remove message' }, context);

      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: 'nl_to_streamlang',
          success: false,
        })
      );
    });

    it('emits success=false with stream_type=unknown when getScopedClients throws before the stream is resolved', async () => {
      // Simulates a failure prior to any stream lookup — the handler
      // cannot know the stream type, so it falls back to "unknown" rather
      // than dropping the event entirely.
      const { getScopedClients } = createMockGetScopedClients();
      getScopedClients.mockRejectedValueOnce(new Error('auth error'));
      const telemetry = {
        trackProcessingPipelineSuggested: jest.fn(),
      } as unknown as EbtTelemetryClient;
      const tool = createDesignPipelineTool({
        getScopedClients,
        logger: loggerMock.create(),
        telemetry,
      });

      await tool.handler(
        { stream_name: 'logs.test', instruction: 'remove message' },
        createMockToolContext()
      );

      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          stream_type: 'unknown',
        })
      );
    });

    it('emits success=false on the heuristic path when runExtractFieldsFlow throws', async () => {
      const { tool, context, telemetry } = setup({
        patternExtractionService: {} as IPatternExtractionService,
      });
      mockRunExtractFieldsFlow.mockRejectedValue(new Error('worker pool exhausted'));

      await tool.handler(
        { stream_name: 'logs.test', instruction: 'parse this stream', extract_fields: true },
        context
      );

      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      // `flow` defaults to `nl_to_streamlang` because the throw happened
      // before the heuristic outcome could be observed; `success: false`
      // is the meaningful signal here.
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });
});

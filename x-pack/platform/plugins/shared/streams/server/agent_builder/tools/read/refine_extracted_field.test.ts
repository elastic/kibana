/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';

// `simulateProcessing` is the heavy dependency — every refine path runs at
// least one simulation (proposed pipeline) and may run a second (existing
// pipeline) for value-collection. We mock it once at the module level and
// return canned shapes from each test.
jest.mock('../../../routes/internal/streams/processing/simulation_handler', () => ({
  simulateProcessing: jest.fn(),
}));

import {
  createRefineExtractedFieldTool,
  runRefineExtractedFieldFlow,
  type RunRefineExtractedFieldDeps,
} from './refine_extracted_field';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';

const mockSimulateProcessing = simulateProcessing as jest.MockedFunction<typeof simulateProcessing>;

const STREAM_NAME = 'logs.test';

/**
 * Build a `ProcessingSimulationResponse` whose per-document `value` mirrors
 * `docs`. Used as the BASELINE simulation (existing pipeline) so the flow
 * sees the field values it needs to validate against.
 */
const baselineSimulationFromDocs = (
  docs: Array<Record<string, unknown>>
): ProcessingSimulationResponse =>
  ({
    detected_fields: [],
    documents: docs.map((value) => ({
      detected_fields: [],
      errors: [],
      status: 'parsed',
      processed_by: [],
      value,
    })),
    processors_metrics: {},
    definition_error: undefined,
    documents_metrics: {
      failed_rate: 0,
      partially_parsed_rate: 0,
      skipped_rate: 0,
      parsed_rate: 1,
      dropped_rate: 0,
    },
  } as ProcessingSimulationResponse);

/** A fully-parsed final simulation used by the success-path tests. */
const successfulFinalSimulation: ProcessingSimulationResponse = {
  detected_fields: [{ name: 'attributes.user.id', esType: 'keyword' }],
  documents: [
    {
      detected_fields: [],
      errors: [],
      status: 'parsed',
      processed_by: [],
      value: { 'attributes.user.id': 'u-1' },
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
} as ProcessingSimulationResponse;

const buildIngestStreamDef = (
  processingSteps: unknown[] = [{ action: 'grok', from: 'body.text', patterns: ['%{IP:ip}'] }]
) => ({
  type: 'wired' as const,
  name: STREAM_NAME,
  description: '',
  ingest: {
    wired: { fields: {}, routing: [] },
    processing: { steps: processingSteps },
    lifecycle: { inherit: {} },
    failure_store: { inherit: {} },
    settings: {},
  },
});

/**
 * Build a deps object suitable for `runRefineExtractedFieldFlow`. Mirrors
 * the pattern used by `extract_fields_handler.test.ts`: cast the
 * partial client mocks back to the public dep types so the call site stays
 * type-checked, while keeping the mocks themselves narrow.
 */
const buildDeps = () => {
  const { getScopedClients, streamsClient, scopedClusterClient } = createMockGetScopedClients();
  const deps: RunRefineExtractedFieldDeps = {
    streamsClient: streamsClient as unknown as RunRefineExtractedFieldDeps['streamsClient'],
    scopedClusterClient:
      scopedClusterClient as unknown as RunRefineExtractedFieldDeps['scopedClusterClient'],
    fieldsMetadataClient: {} as RunRefineExtractedFieldDeps['fieldsMetadataClient'],
    logger: loggerMock.create(),
  };
  return {
    deps,
    getScopedClients,
    streamsClient,
    scopedClusterClient: deps.scopedClusterClient,
  };
};

/**
 * Replace the stream's ES `search` mock so `resolveSamples` returns the
 * given documents. Each document must match the shape the refinement
 * expects (e.g. include the field under test). The cast through
 * `IScopedClusterClient` mirrors the pattern used in
 * `extract_fields_handler.test.ts` — the test helper returns a narrow mock
 * type, but we want to call `mockResolvedValue` with a permissive shape.
 */
const arrangeStreamSamples = (
  scopedClusterClient: RunRefineExtractedFieldDeps['scopedClusterClient'],
  hits: Array<Record<string, unknown>>
) => {
  (scopedClusterClient.asCurrentUser.search as jest.Mock).mockResolvedValue({
    hits: { hits: hits.map((source) => ({ _source: source })) },
  });
};

beforeEach(() => {
  mockSimulateProcessing.mockReset();
});

// ---------------------------------------------------------------------
// runRefineExtractedFieldFlow — core flow
// ---------------------------------------------------------------------
describe('runRefineExtractedFieldFlow', () => {
  it('rejects with `unsupported_stream` for a non-ingest stream', async () => {
    const { deps, streamsClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue({
      type: 'query',
      name: 'logs.errors-view',
      query: { view: 'logs.errors-view', esql: 'FROM logs* | WHERE log.level == "error"' },
    } as never);

    const outcome = await runRefineExtractedFieldFlow(
      {
        stream_name: 'logs.errors-view',
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      deps
    );

    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.reason).toBe('unsupported_stream');
      expect(outcome.message).toContain('only supported for ingest streams');
      expect(outcome.streamType).toBe('query');
    }
    // No simulation call should have been made — we reject before doing
    // any work so the tool stays cheap on misuse.
    expect(mockSimulateProcessing).not.toHaveBeenCalled();
  });

  it('rejects with `no_samples` when sample resolution returns no documents', async () => {
    const { deps, streamsClient, scopedClusterClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue(buildIngestStreamDef() as never);
    arrangeStreamSamples(scopedClusterClient, []);

    const outcome = await runRefineExtractedFieldFlow(
      {
        stream_name: STREAM_NAME,
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      deps
    );

    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.reason).toBe('no_samples');
    }
  });

  it('rejects with `field_not_found` when no sampled document carries the field', async () => {
    // Stream-source samples come back as `documentStatus: 'processed'`
    // (they already reflect the existing pipeline output), so the field's
    // values are read directly off the stored documents. None of these
    // contain `attributes.user.id` → field_not_found.
    const { deps, streamsClient, scopedClusterClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue(buildIngestStreamDef() as never);
    arrangeStreamSamples(scopedClusterClient, [
      { 'body.text': 'no user prefix here' },
      { 'body.text': 'still nothing' },
      { 'body.text': 'and again' },
      { 'body.text': 'plain' },
      { 'body.text': 'plain' },
    ]);

    const outcome = await runRefineExtractedFieldFlow(
      {
        stream_name: STREAM_NAME,
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      deps
    );

    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.reason).toBe('field_not_found');
      expect(outcome.message).toContain('attributes.user.id');
    }
  });

  it('rejects with `insufficient_samples` when fewer than the floor of populated values exist', async () => {
    // Floor is 5; here we provide just 3 populated string values for the
    // target field. Empty strings and missing-on-doc both count as
    // "skipped" (the prefix-strip transform doesn't apply to non-strings
    // or empty values), so observedValues lands at 3.
    const { deps, streamsClient, scopedClusterClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue(buildIngestStreamDef() as never);
    arrangeStreamSamples(scopedClusterClient, [
      { 'attributes.user.id': 'user=u-1' },
      { 'attributes.user.id': 'user=u-2' },
      { 'attributes.user.id': 'user=u-3' },
      { 'attributes.user.id': '' },
      {},
    ]);

    const outcome = await runRefineExtractedFieldFlow(
      {
        stream_name: STREAM_NAME,
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      deps
    );

    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.reason).toBe('insufficient_samples');
      expect(outcome.message).toContain('5'); // mentions the floor
      expect(outcome.message).toContain('attributes.user.id');
    }
  });

  it('rejects with `prefix_mismatch` and quotes example offenders when not 100% match', async () => {
    // Strict-by-design: even a single mismatch aborts. The reasoning is in
    // the handler — silent half-transforms are worse than a rejection
    // because they hit ingest and corrupt data.
    const { deps, streamsClient, scopedClusterClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue(buildIngestStreamDef() as never);
    arrangeStreamSamples(scopedClusterClient, [
      { 'attributes.user.id': 'user=u-1' },
      { 'attributes.user.id': 'user=u-2' },
      { 'attributes.user.id': 'plain-value' },
      { 'attributes.user.id': 'user=u-4' },
      { 'attributes.user.id': 'user=u-5' },
    ]);

    const outcome = await runRefineExtractedFieldFlow(
      {
        stream_name: STREAM_NAME,
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      deps
    );

    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.reason).toBe('prefix_mismatch');
      expect(outcome.message).toContain('80%'); // 4 out of 5
      expect(outcome.message).toContain('"plain-value"');
    }
  });

  it('truncates prefix-mismatch example values longer than 60 chars and annotates the original length', async () => {
    const { deps, streamsClient, scopedClusterClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue(buildIngestStreamDef() as never);
    const longValue = `session=${'x'.repeat(500)}`;
    arrangeStreamSamples(scopedClusterClient, [
      { 'attributes.user.id': 'user=u-1' },
      { 'attributes.user.id': 'user=u-2' },
      { 'attributes.user.id': longValue },
      { 'attributes.user.id': 'user=u-4' },
      { 'attributes.user.id': 'user=u-5' },
    ]);

    const outcome = await runRefineExtractedFieldFlow(
      {
        stream_name: STREAM_NAME,
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      deps
    );

    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.reason).toBe('prefix_mismatch');
      expect(outcome.message).toContain('"session=xxxxxxxxxx');
      expect(outcome.message).toContain(`(truncated, original length ${longValue.length})`);
      expect(outcome.message).not.toContain(longValue);
    }
  });

  it('appends a single `replace` step and returns success when all values match the prefix', async () => {
    const { deps, streamsClient, scopedClusterClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue(buildIngestStreamDef() as never);
    arrangeStreamSamples(scopedClusterClient, [
      { 'attributes.user.id': 'user=u-1' },
      { 'attributes.user.id': 'user=u-2' },
      { 'attributes.user.id': 'user=u-3' },
      { 'attributes.user.id': 'user=u-4' },
      { 'attributes.user.id': 'user=u-5' },
    ]);
    // Only the FINAL simulation runs (samples are stream-sourced, so
    // baseline simulation is skipped — values come directly off the
    // stored docs).
    mockSimulateProcessing.mockResolvedValueOnce(successfulFinalSimulation);

    const outcome = await runRefineExtractedFieldFlow(
      {
        stream_name: STREAM_NAME,
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      deps
    );

    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      // existing_steps preserved unchanged; new replace step appended at
      // the end. We assert the structural shape instead of inspecting the
      // raw step JSON to keep the test resilient to formatting changes.
      expect(outcome.result.existing_steps).toHaveLength(1);
      expect(outcome.result.steps).toHaveLength(2);
      const newStep = outcome.result.steps[1] as {
        action: string;
        from: string;
        pattern: string;
        replacement: string;
      };
      expect(newStep.action).toBe('replace');
      expect(newStep.from).toBe('attributes.user.id');
      expect(newStep.pattern).toBe('^user=');
      expect(newStep.replacement).toBe('');
      // step_changes shows the new step as `added`.
      expect(outcome.result.step_changes.some((c) => c.kind === 'added')).toBe(true);
      // Hint string surfaces what was applied so the agent can summarize
      // it back to the user clearly.
      expect(outcome.result.hints).toEqual(
        expect.arrayContaining([
          expect.stringContaining('strips the "user=" prefix from "attributes.user.id"'),
        ])
      );
    }
  });

  it('escapes regex metacharacters in the prefix to avoid injection-style misbehaviour', async () => {
    // A user-typed prefix that contains regex metacharacters (`.`, `*`,
    // etc.) must be treated as literal, otherwise the appended `replace`
    // step would silently match more than intended.
    const { deps, streamsClient, scopedClusterClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue(buildIngestStreamDef() as never);
    arrangeStreamSamples(scopedClusterClient, [
      { 'attributes.x': 'a.b=v1' },
      { 'attributes.x': 'a.b=v2' },
      { 'attributes.x': 'a.b=v3' },
      { 'attributes.x': 'a.b=v4' },
      { 'attributes.x': 'a.b=v5' },
    ]);
    mockSimulateProcessing.mockResolvedValueOnce(successfulFinalSimulation);

    const outcome = await runRefineExtractedFieldFlow(
      { stream_name: STREAM_NAME, field: 'attributes.x', action: 'drop_prefix', prefix: 'a.b' },
      deps
    );

    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      const newStep = outcome.result.steps[outcome.result.steps.length - 1] as { pattern: string };
      // The `.` MUST be escaped — `^a.b=` would also match `axb=`,
      // `a-b=`, etc., which is not what the user asked for.
      expect(newStep.pattern).toBe('^a\\.b=');
    }
  });

  it('runs the existing pipeline as a baseline when caller supplies `unprocessed` inline samples', async () => {
    // For inline samples marked `unprocessed`, the field values come from
    // running the existing pipeline (not the raw doc). This exercises the
    // `baselineSimulation` branch.
    const { deps, streamsClient } = buildDeps();
    streamsClient.getStream.mockResolvedValue(buildIngestStreamDef() as never);
    mockSimulateProcessing
      .mockResolvedValueOnce(
        baselineSimulationFromDocs([
          { 'attributes.user.id': 'user=u-1' },
          { 'attributes.user.id': 'user=u-2' },
          { 'attributes.user.id': 'user=u-3' },
          { 'attributes.user.id': 'user=u-4' },
          { 'attributes.user.id': 'user=u-5' },
        ])
      )
      .mockResolvedValueOnce(successfulFinalSimulation);

    const outcome = await runRefineExtractedFieldFlow(
      {
        stream_name: STREAM_NAME,
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
        samples: {
          source: 'inline',
          status: 'unprocessed',
          documents: [
            { 'body.text': 'raw-1' },
            { 'body.text': 'raw-2' },
            { 'body.text': 'raw-3' },
            { 'body.text': 'raw-4' },
            { 'body.text': 'raw-5' },
          ],
        },
      },
      deps
    );

    expect(outcome.kind).toBe('success');
    expect(mockSimulateProcessing).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------
  // pipeline_steps — refining a still-proposed pipeline (N15 fix)
  //
  // The dominant flow is: design_pipeline returns a proposed pipeline
  // that captures attributes.user.id, KV hints fire, the user asks to
  // refine BEFORE applying. Without `pipeline_steps`, the tool would
  // look at the live (empty / different) pipeline and reject. With
  // `pipeline_steps`, it simulates the proposed pipeline against the
  // sampled raw documents to validate the refinement.
  // -------------------------------------------------------------------
  describe('pipeline_steps (still-proposed pipeline)', () => {
    const PROPOSED_GROK_STEP = {
      action: 'grok',
      from: 'body.text',
      patterns: ['%{DATA:attributes.user.id}'],
    };

    it('simulates the supplied pipeline_steps against samples even when they are stream-sourced (`processed`)', async () => {
      // Stream-sourced samples reflect the LIVE pipeline (which here is
      // empty). The agent passes `pipeline_steps` = the design_pipeline
      // proposal that DOES capture attributes.user.id. The tool MUST
      // simulate `pipeline_steps` against the raw docs to surface the
      // field — otherwise it would (incorrectly) report field_not_found.
      const { deps, streamsClient, scopedClusterClient } = buildDeps();
      streamsClient.getStream.mockResolvedValue(buildIngestStreamDef([]) as never);
      arrangeStreamSamples(scopedClusterClient, [
        { 'body.text': 'user=u-1' },
        { 'body.text': 'user=u-2' },
        { 'body.text': 'user=u-3' },
        { 'body.text': 'user=u-4' },
        { 'body.text': 'user=u-5' },
      ]);
      // First call is the baseline simulation of `pipeline_steps`,
      // second call is the final simulation (proposed + new replace).
      mockSimulateProcessing
        .mockResolvedValueOnce(
          baselineSimulationFromDocs([
            { 'attributes.user.id': 'user=u-1' },
            { 'attributes.user.id': 'user=u-2' },
            { 'attributes.user.id': 'user=u-3' },
            { 'attributes.user.id': 'user=u-4' },
            { 'attributes.user.id': 'user=u-5' },
          ])
        )
        .mockResolvedValueOnce(successfulFinalSimulation);

      const outcome = await runRefineExtractedFieldFlow(
        {
          stream_name: STREAM_NAME,
          field: 'attributes.user.id',
          action: 'drop_prefix',
          prefix: 'user',
          pipeline_steps: [PROPOSED_GROK_STEP],
        },
        deps
      );

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        // Returned `steps` = proposed + replace.
        expect(outcome.result.steps).toHaveLength(2);
        const [first, second] = outcome.result.steps as unknown as Array<Record<string, unknown>>;
        expect(first.action).toBe('grok');
        expect(second.action).toBe('replace');
        expect(second.from).toBe('attributes.user.id');
        // Final simulation should NOT be partial (samples reflect LIVE,
        // not effectiveExistingSteps), so the full proposed pipeline ran.
        expect(outcome.result.simulation.mode).toBe('complete');
      }
      expect(mockSimulateProcessing).toHaveBeenCalledTimes(2);
    });

    it('returns existing_steps as the LIVE pipeline so the diff captures the full change set', async () => {
      // existing_steps in the result reflects the LIVE pipeline (so
      // update_stream's diff against current state is meaningful), even
      // when pipeline_steps adds steps on top.
      const { deps, streamsClient, scopedClusterClient } = buildDeps();
      streamsClient.getStream.mockResolvedValue(buildIngestStreamDef([]) as never);
      arrangeStreamSamples(scopedClusterClient, [
        { 'body.text': 'user=u-1' },
        { 'body.text': 'user=u-2' },
        { 'body.text': 'user=u-3' },
        { 'body.text': 'user=u-4' },
        { 'body.text': 'user=u-5' },
      ]);
      mockSimulateProcessing
        .mockResolvedValueOnce(
          baselineSimulationFromDocs([
            { 'attributes.user.id': 'user=u-1' },
            { 'attributes.user.id': 'user=u-2' },
            { 'attributes.user.id': 'user=u-3' },
            { 'attributes.user.id': 'user=u-4' },
            { 'attributes.user.id': 'user=u-5' },
          ])
        )
        .mockResolvedValueOnce(successfulFinalSimulation);

      const outcome = await runRefineExtractedFieldFlow(
        {
          stream_name: STREAM_NAME,
          field: 'attributes.user.id',
          action: 'drop_prefix',
          prefix: 'user',
          pipeline_steps: [PROPOSED_GROK_STEP],
        },
        deps
      );

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.result.existing_steps).toEqual([]);
        // Both the proposed grok AND the new replace should appear as
        // `added` in step_changes (they're both new relative to LIVE).
        const addedCount = outcome.result.step_changes.filter((c) => c.kind === 'added').length;
        expect(addedCount).toBe(2);
      }
    });

    it('rejects with field_not_found and points at pipeline_steps when refining the live pipeline fails', async () => {
      // Without pipeline_steps, the tool refines against the live
      // pipeline. When the field is not present there, the rejection
      // message should hint at the pipeline_steps escape hatch so the
      // agent can recover.
      const { deps, streamsClient, scopedClusterClient } = buildDeps();
      streamsClient.getStream.mockResolvedValue(buildIngestStreamDef([]) as never);
      arrangeStreamSamples(scopedClusterClient, [
        { 'body.text': 'user=u-1' },
        { 'body.text': 'user=u-2' },
        { 'body.text': 'user=u-3' },
        { 'body.text': 'user=u-4' },
        { 'body.text': 'user=u-5' },
      ]);

      const outcome = await runRefineExtractedFieldFlow(
        {
          stream_name: STREAM_NAME,
          field: 'attributes.user.id',
          action: 'drop_prefix',
          prefix: 'user',
        },
        deps
      );

      expect(outcome.kind).toBe('rejected');
      if (outcome.kind === 'rejected') {
        expect(outcome.reason).toBe('field_not_found');
        expect(outcome.message).toContain('pipeline_steps');
      }
    });

    it('rejects with field_not_found referencing pipeline_steps when caller-supplied pipeline does not produce the field', async () => {
      // pipeline_steps was provided but doesn't produce the named field.
      // The error message should make it clear that the supplied
      // pipeline_steps is the culprit, not the live pipeline.
      const { deps, streamsClient, scopedClusterClient } = buildDeps();
      streamsClient.getStream.mockResolvedValue(buildIngestStreamDef([]) as never);
      arrangeStreamSamples(scopedClusterClient, [
        { 'body.text': 'no relevant content' },
        { 'body.text': 'still nothing' },
        { 'body.text': 'and again' },
        { 'body.text': 'plain' },
        { 'body.text': 'plain' },
      ]);
      // Baseline simulation of pipeline_steps returns docs that don't
      // contain the target field.
      mockSimulateProcessing.mockResolvedValueOnce(
        baselineSimulationFromDocs([
          { 'something.else': 'x' },
          { 'something.else': 'x' },
          { 'something.else': 'x' },
          { 'something.else': 'x' },
          { 'something.else': 'x' },
        ])
      );

      const outcome = await runRefineExtractedFieldFlow(
        {
          stream_name: STREAM_NAME,
          field: 'attributes.user.id',
          action: 'drop_prefix',
          prefix: 'user',
          pipeline_steps: [PROPOSED_GROK_STEP],
        },
        deps
      );

      expect(outcome.kind).toBe('rejected');
      if (outcome.kind === 'rejected') {
        expect(outcome.reason).toBe('field_not_found');
        expect(outcome.message).toContain('pipeline_steps');
      }
    });
  });
});

// ---------------------------------------------------------------------
// createRefineExtractedFieldTool — wrapper handler
// ---------------------------------------------------------------------
describe('createRefineExtractedFieldTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient, scopedClusterClient } = createMockGetScopedClients();
    const telemetry = {
      trackProcessingPipelineSuggested: jest.fn(),
    } as unknown as EbtTelemetryClient;
    const tool = createRefineExtractedFieldTool({
      getScopedClients,
      logger: loggerMock.create(),
      telemetry,
    });
    return {
      tool,
      context: createMockToolContext(),
      getScopedClients,
      streamsClient,
      scopedClusterClient,
      telemetry,
    };
  };

  it('returns a typed tool error (not a success) when validation rejects, so the agent presents the reason', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.getStream.mockResolvedValue({
      type: 'query',
      name: 'logs.errors-view',
      query: { view: 'logs.errors-view', esql: 'FROM logs* | WHERE log.level == "error"' },
    } as never);

    const result = await tool.handler(
      {
        stream_name: 'logs.errors-view',
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      context
    );

    if (!('results' in result)) throw new Error('Expected results return');
    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as Record<string, unknown>;
    expect(data.likely_cause).toBe('unsupported_stream');
    expect(data.message).toEqual(expect.stringContaining('only supported for ingest streams'));
    expect(data.operation).toBe('refine_extracted_field');
  });

  it('returns a typed tool error when an unexpected exception is thrown', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.getStream.mockRejectedValue(new Error('boom'));

    const result = await tool.handler(
      {
        stream_name: STREAM_NAME,
        field: 'attributes.user.id',
        action: 'drop_prefix',
        prefix: 'user',
      },
      context
    );

    if (!('results' in result)) throw new Error('Expected results return');
    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as Record<string, unknown>;
    expect(data.message).toEqual(expect.stringContaining('boom'));
    expect(data.operation).toBe('refine_extracted_field');
  });

  // ---- telemetry ----
  describe('telemetry', () => {
    it('emits exactly one event with flow=refine_extracted_field on a successful run', async () => {
      const { tool, context, streamsClient, scopedClusterClient, telemetry } = setup();
      streamsClient.getStream.mockResolvedValue(buildIngestStreamDef([]) as never);
      arrangeStreamSamples(scopedClusterClient, [
        { 'attributes.user.id': 'user=u-1' },
        { 'attributes.user.id': 'user=u-2' },
        { 'attributes.user.id': 'user=u-3' },
        { 'attributes.user.id': 'user=u-4' },
        { 'attributes.user.id': 'user=u-5' },
      ]);
      mockSimulateProcessing.mockResolvedValueOnce(successfulFinalSimulation);

      await tool.handler(
        {
          stream_name: STREAM_NAME,
          field: 'attributes.user.id',
          action: 'drop_prefix',
          prefix: 'user',
        },
        context
      );

      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'agent',
          flow: 'refine_extracted_field',
          success: true,
          // Refinement is fully deterministic — no LLM steps involved.
          steps_used: 0,
          stream_name: STREAM_NAME,
          stream_type: 'wired',
        })
      );
    });

    it('emits success=true on a deliberate rejection (the tool itself worked)', async () => {
      // A rejection is intentional, structured behaviour — distinct from
      // an unexpected error. `success: true` here means "the tool ran to
      // completion"; the rejection reason lives in the tool error result.
      const { tool, context, streamsClient, telemetry } = setup();
      streamsClient.getStream.mockResolvedValue({
        type: 'query',
        name: 'logs.errors-view',
        query: { view: 'logs.errors-view', esql: '' },
      } as never);

      await tool.handler(
        {
          stream_name: 'logs.errors-view',
          field: 'attributes.user.id',
          action: 'drop_prefix',
          prefix: 'user',
        },
        context
      );

      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: 'refine_extracted_field',
          success: true,
          stream_type: 'query',
        })
      );
    });

    it('emits success=false with stream_type=unknown when getScopedClients throws before the stream is resolved', async () => {
      const { tool, context, getScopedClients, telemetry } = setup();
      getScopedClients.mockRejectedValueOnce(new Error('auth failure'));

      await tool.handler(
        {
          stream_name: STREAM_NAME,
          field: 'attributes.user.id',
          action: 'drop_prefix',
          prefix: 'user',
        },
        context
      );

      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledTimes(1);
      expect(telemetry.trackProcessingPipelineSuggested).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: 'refine_extracted_field',
          success: false,
          stream_type: 'unknown',
        })
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';
import { injectIgnoreFailure, nlToStreamlang, type NlToStreamlangDeps } from './nl_to_streamlang';

describe('injectIgnoreFailure', () => {
  // Background: every newly-suggested step the agent emits gets
  // `ignore_failure: true` so a single bad sample doesn't sink an entire
  // pipeline. But when we re-emit a step that was already in the user's
  // pipeline, we MUST keep its original `ignore_failure` value — otherwise
  // we'd silently flip a deliberate `ignore_failure: false` to `true`.

  describe('without preserveSteps', () => {
    it('adds `ignore_failure: true` to every action step', () => {
      const steps: StreamlangStep[] = [
        { action: 'grok', from: 'body.text', patterns: ['x'] },
        { action: 'set', to: 'attributes.env', value: 'prod' },
      ];
      const result = injectIgnoreFailure(steps);
      expect(result.every((s) => 'ignore_failure' in s && s.ignore_failure === true)).toBe(true);
    });

    it('overwrites an existing `ignore_failure: false` (no preservation contract)', () => {
      const steps: StreamlangStep[] = [
        {
          action: 'set',
          to: 'attributes.env',
          value: 'prod',
          ignore_failure: false,
        },
      ];
      const result = injectIgnoreFailure(steps);
      expect((result[0] as { ignore_failure: boolean }).ignore_failure).toBe(true);
    });

    it('recurses into condition blocks and tags inner steps', () => {
      const steps: StreamlangStep[] = [
        {
          condition: {
            field: 'severity_text',
            eq: 'ERROR',
            steps: [{ action: 'set', to: 'attributes.error', value: true }],
            else: [{ action: 'set', to: 'attributes.error', value: false }],
          },
        },
      ];
      const result = injectIgnoreFailure(steps);
      const first = result[0] as Extract<StreamlangStep, { condition: unknown }>;
      expect((first.condition.steps[0] as { ignore_failure: boolean }).ignore_failure).toBe(true);
      expect((first.condition.else![0] as { ignore_failure: boolean }).ignore_failure).toBe(true);
    });
  });

  describe('with preserveSteps', () => {
    it('preserves an existing step with `ignore_failure: false` exactly as-is', () => {
      // This is the regression that motivated the preserve list — see B1 in
      // the manual test plan. The user had set `ignore_failure: false`
      // intentionally; merging it through the suggester silently flipped it
      // to `true`.
      const existing: StreamlangStep[] = [
        {
          action: 'set',
          to: 'attributes.environment',
          value: 'staging',
          ignore_failure: false,
        },
      ];
      const merged: StreamlangStep[] = [
        ...existing,
        { action: 'grok', from: 'body.text', patterns: ['x'] },
      ];

      const result = injectIgnoreFailure(merged, existing);

      // The existing step must come back byte-identical.
      expect(result[0]).toEqual(existing[0]);
      // The new step still gets the safety default.
      expect((result[1] as { ignore_failure: boolean }).ignore_failure).toBe(true);
    });

    it('preserves an existing step that has no `ignore_failure` field at all', () => {
      // The legacy `ignore_failure`-less shape is still the default for
      // user-authored pipelines. The structural match must succeed across
      // "no field" vs "field present", so the existing step is returned
      // untouched (still without `ignore_failure`).
      const existing: StreamlangStep[] = [
        { action: 'set', to: 'attributes.environment', value: 'staging' },
      ];
      const merged: StreamlangStep[] = [
        ...existing,
        { action: 'grok', from: 'body.text', patterns: ['x'] },
      ];

      const result = injectIgnoreFailure(merged, existing);
      expect(result[0]).toEqual(existing[0]);
      expect((result[0] as { ignore_failure?: boolean }).ignore_failure).toBeUndefined();
      expect((result[1] as { ignore_failure: boolean }).ignore_failure).toBe(true);
    });

    it('matches existing steps regardless of `customIdentifier` differences', () => {
      // After `addDeterministicCustomIdentifiers` runs over the merged list,
      // the existing step gets a fresh customIdentifier — different from
      // anything the structural key would otherwise see. The matching must
      // ignore customIdentifier so preservation still kicks in.
      const existing: StreamlangStep[] = [
        {
          action: 'set',
          to: 'attributes.environment',
          value: 'staging',
          ignore_failure: false,
        },
      ];
      // `customIdentifier` is part of the StreamlangStep shape but isn't on
      // the public `set` action discriminant, so we widen via `unknown` to
      // attach the simulated retag.
      const mergedWithRetag = [
        {
          action: 'set',
          to: 'attributes.environment',
          value: 'staging',
          ignore_failure: false,
          customIdentifier: 'sim-1',
        } as unknown as StreamlangStep,
        { action: 'grok', from: 'body.text', patterns: ['x'] } as StreamlangStep,
      ];

      const result = injectIgnoreFailure(mergedWithRetag, existing);
      expect((result[0] as { ignore_failure: boolean }).ignore_failure).toBe(false);
    });

    it('does NOT preserve a step that looks similar but differs structurally (different value)', () => {
      // `set attributes.environment="staging"` and `set
      // attributes.environment="prod"` are different steps — the second one
      // should get the default safety treatment.
      const existing: StreamlangStep[] = [
        {
          action: 'set',
          to: 'attributes.environment',
          value: 'staging',
          ignore_failure: false,
        },
      ];
      const merged: StreamlangStep[] = [
        {
          action: 'set',
          to: 'attributes.environment',
          value: 'prod',
          ignore_failure: false,
        },
      ];

      const result = injectIgnoreFailure(merged, existing);
      expect((result[0] as { ignore_failure: boolean }).ignore_failure).toBe(true);
    });

    it('preserves an entire matching condition block as-is (no inner ignore_failure rewrite)', () => {
      // Top-level preservation works on whole steps, and condition blocks
      // are top-level steps. When the block in `merged` is structurally
      // equivalent to the one in `existing` (after the implementation strips
      // ignore_failure from existing), the block must come back untouched —
      // its inner steps don't get a blanket `ignore_failure: true` rewrite.
      const innerStep: StreamlangStep = {
        action: 'set',
        to: 'attributes.severity',
        value: 'high',
      };
      const existing: StreamlangStep[] = [
        { condition: { field: 'severity_text', eq: 'ERROR', steps: [innerStep] } },
      ];
      const merged: StreamlangStep[] = [
        { condition: { field: 'severity_text', eq: 'ERROR', steps: [innerStep] } },
        { action: 'grok', from: 'body.text', patterns: ['x'] },
      ];

      const result = injectIgnoreFailure(merged, existing);
      const block = result[0] as Extract<StreamlangStep, { condition: unknown }>;
      // Inner step did NOT acquire `ignore_failure` — the whole block was
      // preserved as a single unit.
      expect(block.condition.steps[0]).toEqual(innerStep);
      // Sibling new step still gets the safety default.
      expect((result[1] as { ignore_failure: boolean }).ignore_failure).toBe(true);
    });

    it('recurses into condition blocks that do NOT match top-level preservation', () => {
      // When the block itself isn't in preserveSteps (different predicate
      // here), we descend into its inner steps and apply `ignore_failure:
      // true` to each.
      const existing: StreamlangStep[] = [
        { action: 'set', to: 'attributes.environment', value: 'staging' },
      ];
      const merged: StreamlangStep[] = [
        {
          condition: {
            field: 'severity_text',
            eq: 'ERROR',
            steps: [{ action: 'set', to: 'attributes.error', value: true }],
          },
        },
      ];

      const result = injectIgnoreFailure(merged, existing);
      const block = result[0] as Extract<StreamlangStep, { condition: unknown }>;
      expect((block.condition.steps[0] as { ignore_failure: boolean }).ignore_failure).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// nlToStreamlang — full LLM → simulate → retry orchestration
//
// These tests cover the public contract: validation, retry on bad output,
// success rate gating, hint pass-through, and sample resolution. The LLM
// itself is mocked via `chatComplete`.
// ---------------------------------------------------------------------------

describe('nlToStreamlang', () => {
  const wiredStreamDef = (name: string) => ({
    name,
    description: '',
    ingest: {
      wired: { fields: { message: { type: 'text' } }, routing: [] },
      processing: { steps: [] },
      lifecycle: { inherit: {} },
      failure_store: { inherit: {} },
    },
  });

  const makeSimResponse = (
    overrides?: Partial<ProcessingSimulationResponse>
  ): ProcessingSimulationResponse => ({
    detected_fields: [],
    documents: [],
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
  });

  const sampleDocuments = [{ message: 'test log line', '@timestamp': '2026-04-16T00:00:00Z' }];

  const inlineSamples = (
    documents: Array<Record<string, unknown>> = sampleDocuments,
    status: 'processed' | 'unprocessed' = 'processed'
  ) => ({ source: 'inline' as const, documents, status });

  const createMockDeps = (): NlToStreamlangDeps & {
    mockInferenceClient: { chatComplete: jest.Mock };
    mockEsClient: { search: jest.Mock };
  } => {
    const mockInferenceClient = {
      chatComplete: jest.fn(),
    };

    const mockEsClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: sampleDocuments.map((doc) => ({ _source: doc })),
        },
      }),
    };

    return {
      streamsClient: {
        getStream: jest.fn().mockResolvedValue(wiredStreamDef('logs.ecs.test')),
      } as unknown as NlToStreamlangDeps['streamsClient'],
      esClient: mockEsClient as unknown as NlToStreamlangDeps['esClient'],
      inferenceClient: mockInferenceClient as unknown as NlToStreamlangDeps['inferenceClient'],
      simulatePipeline: jest.fn().mockResolvedValue(makeSimResponse()),
      mockInferenceClient,
      mockEsClient,
    };
  };

  it('returns validated steps from LLM response', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: JSON.stringify({
        steps: [{ action: 'remove', from: 'message' }],
      }),
    });

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: inlineSamples(),
        instruction: 'remove the message field',
      },
      deps
    );

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({ action: 'remove', from: 'message' });
    expect(result.summary).toContain('remove');
    expect(result.simulation.success_rate).toBe(100);
    expect(result.simulation.mode).toBeDefined();
    expect(result.samples_info).toEqual({ source: 'inline', count: 1 });
  });

  it('returns multiple steps when described', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: JSON.stringify({
        steps: [
          { action: 'remove', from: 'field_a' },
          { action: 'remove', from: 'field_b' },
          { action: 'remove', from: 'field_c' },
        ],
      }),
    });

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: inlineSamples(),
        instruction: 'remove field_a, field_b, and field_c',
      },
      deps
    );

    expect(result.steps).toHaveLength(3);
  });

  it('retries on Zod validation failure', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete
      .mockResolvedValueOnce({ content: '{ "invalid": true }' })
      .mockResolvedValueOnce({
        content: JSON.stringify({ steps: [{ action: 'remove', from: 'message' }] }),
      });

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: inlineSamples(),
        instruction: 'remove message',
      },
      deps
    );

    expect(deps.mockInferenceClient.chatComplete).toHaveBeenCalledTimes(2);
    expect(result.steps).toHaveLength(1);
  });

  it('throws after exhausting retries', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: 'not valid json at all',
    });

    await expect(
      nlToStreamlang(
        {
          streamName: 'logs.ecs.test',
          samples: inlineSamples(),
          instruction: 'do something',
        },
        deps
      )
    ).rejects.toThrow('Failed to generate valid Streamlang after');
  });

  it('handles simulation errors with retry', async () => {
    const deps = createMockDeps();
    const validSteps = JSON.stringify({
      steps: [{ action: 'remove', from: 'message' }],
    });
    deps.mockInferenceClient.chatComplete.mockResolvedValue({ content: validSteps });

    (deps.simulatePipeline as jest.Mock)
      .mockResolvedValueOnce(
        makeSimResponse({
          definition_error: { type: 'generic_simulation_failure', message: 'grok pattern failed' },
        })
      )
      .mockResolvedValueOnce(makeSimResponse());

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: inlineSamples(),
        instruction: 'remove message',
      },
      deps
    );

    expect(deps.mockInferenceClient.chatComplete).toHaveBeenCalledTimes(2);
    expect(result.steps).toHaveLength(1);
  });

  it('includes field_changes from simulation', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: JSON.stringify({
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:attributes.client_ip}'],
          },
        ],
      }),
    });

    (deps.simulatePipeline as jest.Mock).mockResolvedValue(
      makeSimResponse({
        detected_fields: [{ name: 'attributes.client_ip', esType: 'keyword' }],
        documents: [
          {
            detected_fields: [],
            errors: [],
            status: 'parsed' as const,
            processed_by: [],
            value: { 'attributes.client_ip': '192.168.1.1', message: 'test' },
          },
        ],
      })
    );

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: inlineSamples(),
        instruction: 'parse IP from message',
      },
      deps
    );

    expect(result.field_changes).toContainEqual(
      expect.objectContaining({
        field: 'attributes.client_ip',
        change: 'created',
        type: 'keyword',
        sample_values: expect.arrayContaining(['192.168.1.1']),
      })
    );
  });

  it('returns simulation mode in results with inline unprocessed samples', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: JSON.stringify({
        steps: [{ action: 'remove', from: 'message' }],
      }),
    });

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: inlineSamples(sampleDocuments, 'unprocessed'),
        instruction: 'remove message',
      },
      deps
    );

    expect(result.simulation.mode).toBe('complete');
    expect(result.samples_info).toEqual({ source: 'inline', count: 1 });
  });

  it('returns empty steps with hints when LLM signals unfulfillable', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: JSON.stringify({
        steps: [],
        hints: ['Field "nonexistent" does not exist in the documents.'],
      }),
    });

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: inlineSamples(),
        instruction: 'parse nonexistent field',
      },
      deps
    );

    expect(result.steps).toHaveLength(0);
    expect(result.hints).toContainEqual(expect.stringContaining('does not exist'));
  });

  it('extracts fields from provided documents, not fieldCaps', async () => {
    const deps = createMockDeps();
    const otelDocs = [{ 'body.text': 'my log message', severity_text: 'INFO' }];

    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: JSON.stringify({
        steps: [{ action: 'remove', from: 'body.text' }],
      }),
    });

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: inlineSamples(otelDocs),
        instruction: 'remove body.text',
      },
      deps
    );

    // Concatenate every prompt message before asserting so the test
    // doesn't lock the system prompt to a specific position in
    // `messages` — but we still verify both field names show up so
    // we'd catch a regression where doc-derived fields stop being
    // exposed to the LLM.
    const messages = deps.mockInferenceClient.chatComplete.mock.calls[0][0].messages as Array<{
      content: unknown;
    }>;
    const concatenatedPrompt = messages
      .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
      .join('\n');
    expect(concatenatedPrompt).toContain('body.text');
    expect(concatenatedPrompt).toContain('severity_text');
    expect(result.steps).toHaveLength(1);
  });

  it('auto-fetches documents from stream when samples is omitted', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: JSON.stringify({
        steps: [{ action: 'remove', from: 'message' }],
      }),
    });

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        instruction: 'remove message',
      },
      deps
    );

    expect(deps.mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs.ecs.test',
        size: 100,
        ignore_unavailable: true,
      })
    );
    expect(result.samples_info).toEqual({ source: 'stream', count: 1 });
    expect(result.steps).toHaveLength(1);
  });

  it('auto-fetches with custom size when samples source is stream', async () => {
    const deps = createMockDeps();
    deps.mockInferenceClient.chatComplete.mockResolvedValue({
      content: JSON.stringify({
        steps: [{ action: 'remove', from: 'message' }],
      }),
    });

    const result = await nlToStreamlang(
      {
        streamName: 'logs.ecs.test',
        samples: { source: 'stream', size: 50 },
        instruction: 'remove message',
      },
      deps
    );

    expect(deps.mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs.ecs.test',
        size: 50,
      })
    );
    expect(result.samples_info).toEqual({ source: 'stream', count: 1 });
    expect(result.steps).toHaveLength(1);
  });
});

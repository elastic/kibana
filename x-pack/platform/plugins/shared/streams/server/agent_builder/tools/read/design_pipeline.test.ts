/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nlToStreamlang } from './nl_to_streamlang';
import type { NlToStreamlangDeps } from './nl_to_streamlang';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';

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

describe('nlToStreamlang', () => {
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

    const systemPromptArg = deps.mockInferenceClient.chatComplete.mock.calls[0][0].messages[0]
      .content as string;
    expect(systemPromptArg).toContain('body.text');
    expect(systemPromptArg).toContain('severity_text');
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

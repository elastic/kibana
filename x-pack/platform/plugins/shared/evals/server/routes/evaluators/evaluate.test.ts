/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { API_VERSIONS, EVALS_EVALUATE_URL, EvaluateRequestBody } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { z } from '@kbn/zod/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { EvaluatorDefinition, EvaluatorRegistry } from '../../evaluators/types';
import { awaitTraceReady, TraceReadinessError } from '../../evaluators/trace_readiness';
import { getInstrumentationProfile } from '../../evaluators/evidence/resolve_instrumentation';
import { registerEvaluateRoute } from './evaluate';
import {
  buildClaudeCodeApiResponseDoc,
  buildClaudeCodeToolSpanDoc,
  buildClaudeCodeUserPromptDoc,
  buildSearchMock,
  hasTermFilter,
  withHits,
} from './test_helpers';

jest.mock('../../evaluators/trace_readiness', () => ({
  ...jest.requireActual('../../evaluators/trace_readiness'),
  awaitTraceReady: jest.fn(),
}));
const awaitTraceReadyMock = awaitTraceReady as jest.MockedFunction<typeof awaitTraceReady>;
const DEFAULT_ROUND = {
  input: { message: 'default input' },
  response: { message: 'default response' },
  steps: [],
};
const CLAUDE_TRACE_ID = '0af7651916cd43dd8448eb211c8031ab';

describe('POST /internal/evals/_evaluate', () => {
  const buildEvaluator = ({
    name = 'groundedness',
    version = '1.0.0',
    kind = 'llm',
    evaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'groundedness', score: 1, label: 'GROUNDED' }],
    }),
  }: Partial<EvaluatorDefinition> & Pick<EvaluatorDefinition, 'name'>): EvaluatorDefinition => ({
    name,
    version,
    kind,
    description: `${name} evaluator`,
    evaluate,
  });

  const buildEvaluatorRegistry = (definitions: EvaluatorDefinition[] = []): EvaluatorRegistry => ({
    list: () => definitions,
    get: (name: string, version?: string) =>
      definitions.find(
        (definition) =>
          definition.name === name && (version === undefined || definition.version === version)
      ),
  });

  const buildContext = (
    searchMock: jest.Mock = jest.fn().mockResolvedValue({
      hits: {
        hits: [],
      },
    })
  ) =>
    ({
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asInternalUser: {
              search: searchMock,
            },
          },
        },
      }),
    } as const);

  const setup = ({
    evaluatorRegistry,
    inferenceStart,
  }: {
    evaluatorRegistry?: EvaluatorRegistry;
    inferenceStart?: InferenceServerStart;
  } = {}) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const versionedRouter = router.versioned as MockedVersionedRouter;

    registerEvaluateRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: evaluatorRegistry ?? buildEvaluatorRegistry(),
      getInferenceStart: async () =>
        inferenceStart ??
        ({
          getClient: jest.fn(),
        } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const route = versionedRouter.getRoute('post', EVALS_EVALUATE_URL);
    const routeConfig = versionedRouter.post.mock.calls[0][0];
    const { handler } = route.versions[API_VERSIONS.internal.v1];

    return { handler, routeConfig, logger };
  };

  beforeEach(() => {
    awaitTraceReadyMock.mockResolvedValue(DEFAULT_ROUND);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers manage privilege authz requirement', () => {
    const { routeConfig } = setup();

    expect(routeConfig.security).toEqual({
      authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
    });
  });

  it('returns two ok results, reuses one trace accessor, and caches inference client by connector', async () => {
    const round = {
      input: { message: 'What is the payment status?' },
      response: { message: 'Payment service is healthy.' },
      steps: [
        {
          tool_call_id: 'call-1',
          tool_id: 'health_check',
          arguments: { service: 'payments' },
          result: { status: 'healthy' },
        },
      ],
    };
    awaitTraceReadyMock.mockResolvedValueOnce(round);
    const firstEvaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'groundedness', score: 0.9, label: 'GROUNDED' }],
    });
    const secondEvaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'correctness', score: 0.8, label: 'FACTUAL' }],
    });
    const groundedness = buildEvaluator({
      name: 'groundedness',
      kind: 'llm',
      evaluate: firstEvaluate,
    });
    const correctness = buildEvaluator({
      name: 'correctness',
      kind: 'llm',
      evaluate: secondEvaluate,
    });
    const getClient = jest.fn().mockReturnValue({ prompt: jest.fn() });
    const searchMock = jest
      .fn()
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-10T09:00:00.000Z',
                'attributes.content': 'What is the payment status?',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-10T09:00:01.000Z',
                'attributes.message.content': 'Payment service is healthy.',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-10T09:00:00.500Z',
                'attributes.gen_ai.tool.call.id': 'call-1',
                'attributes.gen_ai.tool.name': 'health_check',
                'attributes.gen_ai.tool.call.arguments': '{"service":"payments"}',
                'attributes.gen_ai.tool.call.result': '{"status":"healthy"}',
              },
            },
          ],
        },
      });
    const { handler, logger } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([groundedness, correctness]),
      inferenceStart: { getClient } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext(searchMock) as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            mode: 'single-turn',
            traces: [
              { trace_id: '0af7651916cd43dd8448eb211c80319c', reference_data: { expected: 'ok' } },
            ],
          },
          evaluators: [
            { name: 'groundedness', connector_id: 'connector-123' },
            { name: 'correctness', connector_id: 'connector-123' },
          ],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.results).toHaveLength(2);
    expect(response.payload.results).toEqual([
      expect.objectContaining({
        evaluator: expect.objectContaining({ name: 'groundedness' }),
        status: 'ok',
      }),
      expect.objectContaining({
        evaluator: expect.objectContaining({ name: 'correctness' }),
        status: 'ok',
      }),
    ]);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledWith({
      request: expect.any(Object),
      bindTo: { connectorId: 'connector-123' },
    });
    expect(firstEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        trace: expect.objectContaining({ traceId: '0af7651916cd43dd8448eb211c80319c' }),
        round,
        referenceData: { expected: 'ok' },
        inferenceClient: expect.any(Object),
        log: logger,
      })
    );
    expect(secondEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        trace: firstEvaluate.mock.calls[0][0].trace,
        round: firstEvaluate.mock.calls[0][0].round,
        referenceData: { expected: 'ok' },
        inferenceClient: expect.any(Object),
        log: logger,
      })
    );
  });

  it('uses otel-genai-attributes mapping when requested', async () => {
    const round = {
      input: { message: 'How many failed payments?' },
      response: { message: 'There were 12 failed payments today.' },
      steps: [],
    };
    awaitTraceReadyMock.mockResolvedValueOnce(round);
    const evaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'latency', score: 42 }],
    });
    const searchMock = jest
      .fn()
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-10T09:00:00.000Z',
                'attributes.gen_ai.input.messages': JSON.stringify([
                  { role: 'system', parts: [{ type: 'text', content: 'system context' }] },
                  { role: 'user', parts: [{ type: 'text', content: 'How many failed payments?' }] },
                ]),
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-10T09:00:01.000Z',
                'attributes.gen_ai.output.messages': [
                  {
                    role: 'assistant',
                    parts: [{ type: 'text', content: 'There were 12 failed payments today.' }],
                  },
                ],
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });
    const { handler, logger } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([
        buildEvaluator({
          name: 'latency',
          kind: 'code',
          evaluate,
        }),
      ]),
    });

    const response = await handler(
      buildContext(searchMock) as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }],
            instrumentation: { profile: 'otel-genai-attributes' },
          },
          evaluators: [{ name: 'latency' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        round,
      })
    );
    expect(awaitTraceReadyMock).toHaveBeenCalledWith(
      expect.objectContaining({ traceId: '0af7651916cd43dd8448eb211c80319c' }),
      getInstrumentationProfile('otel-genai-attributes'),
      'otel-genai-attributes',
      logger
    );
  });

  it('normalizes claude-code instrumentation into an EvidenceRound for evaluator execution', async () => {
    const actualTraceReadiness = jest.requireActual(
      '../../evaluators/trace_readiness'
    ) as typeof import('../../evaluators/trace_readiness');
    awaitTraceReadyMock.mockImplementation(actualTraceReadiness.awaitTraceReady);

    const evaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'groundedness', score: 0.95, label: 'GROUNDED' }],
    });
    const searchMock = buildSearchMock(async ({ index, filters }) => {
      if (index === 'logs-*' && hasTermFilter(filters, 'event_name', 'user_prompt')) {
        return withHits([
          buildClaudeCodeUserPromptDoc({
            timestamp: '2026-07-10T11:00:00.000Z',
            prompt: 'Find payment failures from the last hour.',
          }),
        ]);
      }
      if (index === 'logs-*' && hasTermFilter(filters, 'event_name', 'api_response_body')) {
        return withHits([
          buildClaudeCodeApiResponseDoc({
            timestamp: '2026-07-10T11:00:01.000Z',
            content: [{ type: 'text', text: 'I found 12 payment failures in the last hour.' }],
          }),
        ]);
      }
      if (index === 'traces-*' && hasTermFilter(filters, 'span.name', 'claude_code.tool')) {
        return withHits([
          buildClaudeCodeToolSpanDoc({
            timestamp: '2026-07-10T11:00:00.500Z',
            toolName: 'search_payments',
            toolInput: '[TOOL INPUT: search_payments]\n{"window":"1h"}',
            newContext: '[TOOL RESULT: search_payments]\n{"count":12}',
          }),
        ]);
      }
      return withHits([{ '@timestamp': '2026-07-10T11:00:00.000Z' }]);
    });
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([
        buildEvaluator({
          name: 'groundedness',
          kind: 'code',
          evaluate,
        }),
      ]),
    });

    const response = await handler(
      buildContext(searchMock) as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            traces: [{ trace_id: CLAUDE_TRACE_ID }],
            instrumentation: { profile: 'claude-code' },
          },
          evaluators: [{ name: 'groundedness' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        round: {
          input: { message: 'Find payment failures from the last hour.' },
          response: { message: 'I found 12 payment failures in the last hour.' },
          steps: [
            {
              tool_id: 'search_payments',
              arguments: { window: '1h' },
              result: { count: 12 },
            },
          ],
        },
      })
    );
  });

  it('rejects unknown instrumentation profiles at request validation', () => {
    const result = EvaluateRequestBody.safeParse({
      subject: {
        traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }],
        instrumentation: { profile: 'unknown-profile' },
      },
      evaluators: [{ name: 'latency' }],
    });

    expect(result.success).toBe(false);
  });

  it('returns evidence_unmet without inference calls when evaluator evidence requirements fail', async () => {
    awaitTraceReadyMock.mockResolvedValueOnce({
      input: { message: 'What is the payment status?' },
      response: { message: '' },
      steps: [],
    });
    const groundednessEvaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'groundedness', score: 1, label: 'GROUNDED' }],
    });
    const latencyEvaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'latency', score: 42 }],
    });
    const getClient = jest.fn().mockReturnValue({ prompt: jest.fn() });
    const searchMock = jest
      .fn()
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-07-10T09:00:00.000Z',
                'attributes.content': 'What is the payment status?',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([
        {
          ...buildEvaluator({
            name: 'groundedness',
            kind: 'llm',
            evaluate: groundednessEvaluate,
          }),
          evidenceSchema: z.object({
            input: z.object({ message: z.string().trim().min(1) }),
            response: z.object({ message: z.string().trim().min(1) }),
            steps: z.array(z.object({}).catchall(z.unknown())),
          }),
        },
        buildEvaluator({ name: 'latency', kind: 'code', evaluate: latencyEvaluate }),
      ]),
      inferenceStart: { getClient } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext(searchMock) as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }],
          },
          evaluators: [
            { name: 'groundedness', connector_id: 'connector-123' },
            { name: 'latency' },
          ],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.results).toEqual([
      expect.objectContaining({
        status: 'error',
        evaluator: expect.objectContaining({ name: 'groundedness' }),
        error: expect.objectContaining({
          code: 'evidence_unmet',
        }),
      }),
      expect.objectContaining({
        status: 'ok',
        evaluator: expect.objectContaining({ name: 'latency' }),
      }),
    ]);
    expect(response.payload.results[0].error.message).toContain('response.message');
    expect(getClient).not.toHaveBeenCalled();
    expect(groundednessEvaluate).not.toHaveBeenCalled();
    expect(latencyEvaluate).toHaveBeenCalledTimes(1);
  });

  it('returns 200 for metrics-only evaluators when response evidence is missing', async () => {
    awaitTraceReadyMock.mockResolvedValueOnce({
      input: { message: 'What is the payment status?' },
      response: { message: '' },
      steps: [],
    });
    const latencyEvaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'latency', score: 42 }],
    });
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([
        buildEvaluator({ name: 'latency', kind: 'code', evaluate: latencyEvaluate }),
      ]),
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }],
          },
          evaluators: [{ name: 'latency' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.results).toEqual([
      expect.objectContaining({
        status: 'ok',
        evaluator: expect.objectContaining({ name: 'latency' }),
        scores: [{ name: 'latency', score: 42 }],
      }),
    ]);
    expect(latencyEvaluate).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for unknown evaluator names', async () => {
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry(),
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: 'trace-1' }] },
          evaluators: [{ name: 'missing' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({ message: 'Evaluator not found: missing' });
  });

  it('returns 400 for pinned version misses', async () => {
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([buildEvaluator({ name: 'groundedness' })]),
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: 'trace-1' }] },
          evaluators: [{ name: 'groundedness', version: '9.9.9' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({ message: 'Evaluator not found: groundedness@9.9.9' });
  });

  it('returns 400 when connector_id is missing for llm evaluators', async () => {
    const groundedness = buildEvaluator({ name: 'groundedness', kind: 'llm' });
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([groundedness]),
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: 'trace-1' }] },
          evaluators: [{ name: 'groundedness' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({
      message: 'connector_id is required for llm evaluator "groundedness"',
    });
  });

  it('returns 400 when required reference_data fields are missing', async () => {
    const correctness: EvaluatorDefinition = {
      ...buildEvaluator({ name: 'correctness', kind: 'llm' }),
      referenceDataSchema: z.object({
        expected: z.string().trim().min(1),
      }),
    };
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([correctness]),
      inferenceStart: {
        getClient: jest.fn().mockReturnValue({ prompt: jest.fn() }),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }],
          },
          evaluators: [{ name: 'correctness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload.message).toContain(
      'Invalid reference_data for evaluator "correctness"'
    );
  });

  it('validates combined reference_data for multiple evaluators with disjoint schemas', async () => {
    const evaluatorA: EvaluatorDefinition = {
      ...buildEvaluator({ name: 'evaluator_a', kind: 'llm' }),
      referenceDataSchema: z.object({ expected: z.string().min(1) }),
    };
    const evaluatorB: EvaluatorDefinition = {
      ...buildEvaluator({ name: 'evaluator_b', kind: 'llm' }),
      referenceDataSchema: z.object({ context: z.string().min(1) }),
    };
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([evaluatorA, evaluatorB]),
      inferenceStart: {
        getClient: jest.fn().mockReturnValue({ prompt: jest.fn() }),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            traces: [
              {
                trace_id: '0af7651916cd43dd8448eb211c80319c',
                reference_data: { expected: 'answer', context: 'some context' },
              },
            ],
          },
          evaluators: [
            { name: 'evaluator_a', connector_id: 'connector-1' },
            { name: 'evaluator_b', connector_id: 'connector-1' },
          ],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(evaluatorA.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ referenceData: { expected: 'answer' } })
    );
    expect(evaluatorB.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ referenceData: { context: 'some context' } })
    );
  });

  it('returns 400 for multi-turn mode', async () => {
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([buildEvaluator({ name: 'groundedness' })]),
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            mode: 'multi-turn',
            traces: [{ trace_id: 'trace-1' }, { trace_id: 'trace-2' }],
          },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({ message: 'multi-turn evaluation is not yet supported' });
  });

  it('returns 400 when single-turn mode does not have exactly one trace', async () => {
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([buildEvaluator({ name: 'groundedness' })]),
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            mode: 'single-turn',
            traces: [{ trace_id: 'trace-1' }, { trace_id: 'trace-2' }],
          },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({ message: 'single-turn mode requires exactly one trace' });
  });

  it('returns 400 for an invalid trace_id', async () => {
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([buildEvaluator({ name: 'groundedness' })]),
      inferenceStart: {
        getClient: jest.fn().mockReturnValue({ prompt: jest.fn() }),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: 'x" OR true OR "' }] },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({
      message: 'Invalid trace_id: must be a 32-character hex string',
    });
  });

  it('returns per-item runtime errors while keeping sibling evaluator results', async () => {
    const failingEvaluate = jest.fn().mockRejectedValue(new Error('failed badly'));
    const successfulEvaluate = jest.fn().mockResolvedValue({
      scores: [{ name: 'latency', score: 42 }],
    });
    const groundedness = buildEvaluator({
      name: 'groundedness',
      kind: 'llm',
      evaluate: failingEvaluate,
    });
    const latency = buildEvaluator({
      name: 'latency',
      kind: 'code',
      evaluate: successfulEvaluate,
    });

    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([groundedness, latency]),
      inferenceStart: {
        getClient: jest.fn().mockReturnValue({ prompt: jest.fn() }),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }] },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }, { name: 'latency' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.results).toEqual([
      {
        status: 'error',
        evaluator: { name: 'groundedness', version: '1.0.0', kind: 'llm' },
        error: { message: 'Error: failed badly' },
      },
      expect.objectContaining({
        status: 'ok',
        evaluator: expect.objectContaining({ name: 'latency' }),
        scores: [{ name: 'latency', score: 42 }],
      }),
    ]);
  });

  it('passes through multi-score results unchanged within a single result item', async () => {
    const evaluate = jest.fn().mockResolvedValue({
      scores: [
        { name: 'factuality', score: 0.7, label: 'HIGH' },
        { name: 'relevance', score: 0.5, label: 'MEDIUM' },
        { name: 'sequence_accuracy', score: 0.4, label: 'LOW' },
      ],
    });
    const correctness = buildEvaluator({
      name: 'correctness',
      kind: 'llm',
      evaluate,
    });
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([correctness]),
      inferenceStart: {
        getClient: jest.fn().mockReturnValue({ prompt: jest.fn() }),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: {
            traces: [
              {
                trace_id: '0af7651916cd43dd8448eb211c80319c',
                reference_data: { expected: 'answer' },
              },
            ],
          },
          evaluators: [{ name: 'correctness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.results).toEqual([
      expect.objectContaining({
        status: 'ok',
        evaluator: expect.objectContaining({ name: 'correctness' }),
        scores: [
          { name: 'factuality', score: 0.7, label: 'HIGH' },
          { name: 'relevance', score: 0.5, label: 'MEDIUM' },
          { name: 'sequence_accuracy', score: 0.4, label: 'LOW' },
        ],
      }),
    ]);
  });

  it('returns 404 when evidence is unresolvable for the requested profile', async () => {
    awaitTraceReadyMock.mockRejectedValueOnce(
      new TraceReadinessError(
        'Trace abc123 has documents but evidence is unresolvable for profile "elastic-inference"',
        'unresolvable'
      )
    );
    const groundedness = buildEvaluator({ name: 'groundedness', kind: 'llm' });
    const latency = buildEvaluator({ name: 'latency', kind: 'code' });
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([groundedness, latency]),
      inferenceStart: {
        getClient: jest.fn().mockReturnValue({ prompt: jest.fn() }),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }] },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }, { name: 'latency' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message:
        'TraceReadinessError: Trace abc123 has documents but evidence is unresolvable for profile "elastic-inference"',
    });
    expect(groundedness.evaluate).not.toHaveBeenCalled();
    expect(latency.evaluate).not.toHaveBeenCalled();
  });

  it('returns 404 when trace documents are never indexed', async () => {
    awaitTraceReadyMock.mockRejectedValueOnce(
      new TraceReadinessError(
        'Trace abc123 is not ready: no documents indexed in traces-* or logs-* yet',
        'not_ready'
      )
    );
    const groundedness = buildEvaluator({ name: 'groundedness', kind: 'llm' });
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry([groundedness]),
      inferenceStart: {
        getClient: jest.fn().mockReturnValue({ prompt: jest.fn() }),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }] },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message:
        'TraceReadinessError: Trace abc123 is not ready: no documents indexed in traces-* or logs-* yet',
    });
    expect(groundedness.evaluate).not.toHaveBeenCalled();
  });
});

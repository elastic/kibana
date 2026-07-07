/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServiceMock } from '@kbn/core/server/mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { API_VERSIONS, EVALS_EVALUATE_URL, TRACES_INDEX_PATTERN } from '@kbn/evals-common';
import { EVALS_API_PRIVILEGES } from '../../common';
import { createEvaluatorRegistry } from '../evaluators/registry';
import type { GroundednessAnalysis } from '../evaluators/groundedness/types';
import type { CorrectnessAnalysis } from '../evaluators/correctness/types';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { registerEvaluateRoute } from '../routes/evaluators/evaluate';

const logger = loggingSystemMock.createLogger();

// Chat evidence and tool-call history are read via DSL `_search` (not ES|QL): `_source`
// still holds the full value even when a long `gen_ai.*` event field exceeded a
// keyword's `ignore_above` and got dropped from doc values.
const createMockSearch = ({ hasToolEvidence }: { hasToolEvidence: boolean }) => {
  const userPrompt = hasToolEvidence
    ? 'What is the payment service status?'
    : 'What is the billing service status?';
  const agentResponse = hasToolEvidence
    ? 'The payment service is healthy, as confirmed by the health check tool.'
    : 'The billing service has 99.9% uptime based on the last 30 days.';

  return jest.fn().mockImplementation(async (params: { index: string; _source?: string[] }) => {
    const fields = params._source ?? [];

    if (fields.includes('attributes.content')) {
      return { hits: { hits: [{ _source: { attributes: { content: userPrompt } } }] } };
    }

    if (fields.includes('attributes.message.content')) {
      return {
        hits: { hits: [{ _source: { attributes: { 'message.content': agentResponse } } }] },
      };
    }

    if (params.index === TRACES_INDEX_PATTERN) {
      return {
        hits: {
          hits: hasToolEvidence
            ? [
                {
                  _source: {
                    attributes: {
                      'gen_ai.tool.call.id': 'call_123',
                      'gen_ai.tool.name': 'health_check',
                      'gen_ai.tool.call.arguments': '{"service":"payment"}',
                      'gen_ai.tool.call.result': '{"status":"healthy"}',
                    },
                  },
                },
              ]
            : [],
        },
      };
    }

    throw new Error(`Unexpected DSL search in integration test: ${JSON.stringify(params)}`);
  });
};

// The `latency` evaluator still aggregates via ES|QL `STATS` (numeric, unaffected by
// ignore_above), so it keeps its own mock separate from the DSL search mock above.
const createMockEsqlQuery = () =>
  jest.fn().mockImplementation(async ({ query }: { query: string }) => {
    if (query.includes('latency_seconds')) {
      return {
        columns: [{ name: 'latency_seconds', type: 'double' }],
        values: [[2.5]],
      };
    }

    throw new Error(`Unexpected ES|QL query in integration test: ${query}`);
  });

describe('trace evaluators integration', () => {
  const setupRoute = ({
    dslSearch,
    esqlQuery = createMockEsqlQuery(),
    prompt,
  }: {
    dslSearch: jest.Mock;
    esqlQuery?: jest.Mock;
    prompt: jest.Mock;
  }) => {
    const router = httpServiceMock.createRouter();
    const versionedRouter = router.versioned as MockedVersionedRouter;
    const getClient = jest.fn().mockReturnValue({ prompt } as unknown as BoundInferenceClient);

    registerEvaluateRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () =>
        ({
          getClient,
        } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const route = versionedRouter.getRoute('post', EVALS_EVALUATE_URL);
    const { handler } = route.versions[API_VERSIONS.internal.v1];
    const context = {
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asInternalUser: {
              esql: {
                query: esqlQuery,
              },
              search: dslSearch,
            },
          },
        },
      }),
    } as unknown as Parameters<typeof handler>[0];

    return { handler, context, getClient };
  };

  it('returns expected groundedness and batch latency results from the batch evaluate route', async () => {
    const prompt = jest
      .fn()
      .mockImplementation(async ({ input }: { input: { tool_call_history: string } }) => {
        const toolCalls = JSON.parse(input.tool_call_history) as Array<{
          tool_id?: string;
          tool_call_id?: string;
        }>;
        const grounded = toolCalls.some((toolCall) => toolCall.tool_id === 'health_check');

        const analysis = (
          grounded
            ? {
                summary_verdict: 'GROUNDED',
                analysis: [
                  {
                    claim: 'Payment service is healthy',
                    centrality: 'central',
                    centrality_reason: 'Directly answers the question',
                    verdict: 'FULLY_SUPPORTED',
                    evidence: {
                      tool_call_id: 'call_123',
                      tool_id: 'health_check',
                      evidence_snippet: '{"status":"healthy"}',
                    },
                    explanation: 'Tool output supports the claim',
                  },
                ],
              }
            : {
                summary_verdict: 'MAJOR_HALLUCINATIONS',
                analysis: [
                  {
                    claim: 'Billing service has 99.9% uptime',
                    centrality: 'central',
                    centrality_reason: 'Main response claim',
                    verdict: 'NOT_FOUND',
                    evidence: undefined,
                    explanation: 'No supporting tool evidence',
                  },
                ],
              }
        ) as GroundednessAnalysis;

        return {
          toolCalls: [{ function: { arguments: analysis } }],
        };
      });
    const { handler, context } = setupRoute({
      dslSearch: createMockSearch({ hasToolEvidence: true }),
      prompt,
    });

    const groundedResponse = await handler(
      context,
      {
        body: {
          subject: {
            mode: 'single-turn',
            traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }],
          },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(groundedResponse.status).toBe(200);
    const groundedResult = groundedResponse.payload.results[0];
    expect(groundedResult.status).toBe('ok');
    expect(groundedResult.scores).toHaveLength(1);
    const groundedScore = groundedResult.scores[0];
    expect(groundedScore.label).toBe('GROUNDED');
    const groundedAnalysis = groundedScore.metadata?.analysis as Array<{
      evidence?: { tool_id?: string };
    }>;
    expect(groundedAnalysis.some((entry) => entry.evidence?.tool_id === 'health_check')).toBe(true);

    const batchResponse = await handler(
      context,
      {
        body: {
          subject: {
            mode: 'single-turn',
            traces: [{ trace_id: '0af7651916cd43dd8448eb211c80319c' }],
          },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }, { name: 'latency' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(batchResponse.status).toBe(200);
    expect(batchResponse.payload.results).toHaveLength(2);
    expect(batchResponse.payload.results).toEqual([
      expect.objectContaining({
        evaluator: expect.objectContaining({ name: 'groundedness' }),
        status: 'ok',
        scores: [expect.objectContaining({ name: 'groundedness' })],
      }),
      expect.objectContaining({
        evaluator: expect.objectContaining({ name: 'latency' }),
        status: 'ok',
        scores: [expect.objectContaining({ name: 'latency', score: 2.5 })],
      }),
    ]);

    const hallucinatedPrompt = jest.fn().mockResolvedValue({
      toolCalls: [
        {
          function: {
            arguments: {
              summary_verdict: 'MAJOR_HALLUCINATIONS',
              analysis: [
                {
                  claim: 'Billing service has 99.9% uptime',
                  centrality: 'central',
                  centrality_reason: 'Main response claim',
                  verdict: 'NOT_FOUND',
                  evidence: undefined,
                  explanation: 'No supporting tool evidence',
                },
              ],
            } satisfies GroundednessAnalysis,
          },
        },
      ],
    });
    const hallucinatedRoute = setupRoute({
      dslSearch: createMockSearch({ hasToolEvidence: false }),
      prompt: hallucinatedPrompt,
    });
    const hallucinatedResponse = await hallucinatedRoute.handler(
      hallucinatedRoute.context,
      {
        body: {
          subject: {
            mode: 'single-turn',
            traces: [{ trace_id: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' }],
          },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(hallucinatedResponse.status).toBe(200);
    const hallucinatedLabel = hallucinatedResponse.payload.results[0]?.scores?.[0]?.label;
    expect(['MINOR_HALLUCINATIONS', 'MAJOR_HALLUCINATIONS']).toContain(hallucinatedLabel);
  });

  it('returns correctness sub-scores from one evaluator execution', async () => {
    const correctnessPrompt = jest
      .fn()
      .mockImplementation(async ({ input }: { input: unknown }) => {
        const payload = input as { ground_truth_response?: string };
        if (!payload.ground_truth_response) {
          throw new Error('Expected correctness input to include ground_truth_response');
        }

        const analysis: CorrectnessAnalysis = {
          summary: {
            factual_accuracy_summary: 'ACCURATE',
            relevance_summary: 'RELEVANT',
            sequence_accuracy_summary: 'MATCH',
          },
          analysis: [
            {
              claim: 'The payment service is healthy',
              centrality: 'central',
              centrality_reason: 'Core answer',
              verdict: 'FULLY_SUPPORTED',
              sequence_match: 'MATCH',
              justification_snippet: 'status=healthy',
              explanation: 'Ground truth confirms the claim',
            },
          ],
        };

        return {
          toolCalls: [{ function: { arguments: analysis } }],
        };
      });
    const { handler, context } = setupRoute({
      dslSearch: createMockSearch({ hasToolEvidence: true }),
      prompt: correctnessPrompt,
    });

    const response = await handler(
      context,
      {
        body: {
          subject: {
            mode: 'single-turn',
            traces: [
              {
                trace_id: 'fedcba9876543210fedcba9876543210',
                reference_data: {
                  expected: 'The payment service is healthy.',
                },
              },
            ],
          },
          evaluators: [{ name: 'correctness', connector_id: 'connector-1' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    const scores: Array<{ name: string }> = response.payload.results[0]?.scores ?? [];
    expect(scores.map((score) => score.name)).toEqual([
      'factuality',
      'relevance',
      'sequence_accuracy',
    ]);
  });

  it('returns 400 when correctness evaluator is called with invalid reference data', async () => {
    const { handler, context } = setupRoute({
      dslSearch: createMockSearch({ hasToolEvidence: true }),
      prompt: jest.fn(),
    });

    const response = await handler(
      context,
      {
        body: {
          subject: {
            mode: 'single-turn',
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

  it('enforces manage privilege in evaluator evaluate route security config', async () => {
    const router = httpServiceMock.createRouter();
    const versionedRouter = router.versioned as MockedVersionedRouter;

    registerEvaluateRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () =>
        ({
          getClient: jest.fn(),
        } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const routeConfig = versionedRouter.post.mock.calls[0][0];
    expect(routeConfig.security).toEqual({
      authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
    });
  });
});

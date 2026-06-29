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
import { API_VERSIONS, EVALS_EVALUATOR_EVALUATE_URL } from '@kbn/evals-common';
import { EVALS_API_PRIVILEGES } from '../../common';
import { groundednessEvaluator } from '../evaluators/groundedness';
import type { TraceAccessor } from '../evaluators/types';
import type { GroundednessAnalysis } from '../evaluators/groundedness/types';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { registerExecuteEvaluatorRoute } from '../routes/evaluators/execute_evaluator';
import type { EvaluatorRegistry } from '../evaluators/types';

const logger = loggingSystemMock.createLogger();

const createMockTraceAccessor = ({
  traceId,
  hasToolEvidence,
}: {
  traceId: string;
  hasToolEvidence: boolean;
}): TraceAccessor => {
  const userPrompt = hasToolEvidence
    ? 'What is the payment service status?'
    : 'What is the billing service status?';
  const agentResponse = hasToolEvidence
    ? 'The payment service is healthy, as confirmed by the health check tool.'
    : 'The billing service has 99.9% uptime based on the last 30 days.';

  const esqlQuery = jest.fn().mockImplementation(async ({ query }: { query: string }) => {
    if (query.includes('event_name == "gen_ai.user.message"')) {
      return {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'attributes.content', type: 'keyword' },
          { name: 'span_id', type: 'keyword' },
        ],
        values: [[new Date().toISOString(), userPrompt, 'span-001']],
      };
    }

    if (query.includes('event_name == "gen_ai.choice"')) {
      return {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'attributes.message.content', type: 'keyword' },
          { name: 'span_id', type: 'keyword' },
        ],
        values: [[new Date().toISOString(), agentResponse, 'span-002']],
      };
    }

    if (query.includes('attributes.elastic.inference.span.kind == "TOOL"')) {
      return {
        columns: [
          { name: 'attributes.gen_ai.tool.call.id', type: 'keyword' },
          { name: 'attributes.gen_ai.tool.name', type: 'keyword' },
          { name: 'attributes.gen_ai.tool.call.arguments', type: 'keyword' },
          { name: 'attributes.gen_ai.tool.call.result', type: 'keyword' },
          { name: '@timestamp', type: 'date' },
        ],
        values: hasToolEvidence
          ? [
              [
                'call_123',
                'health_check',
                '{"service":"payment"}',
                '{"status":"healthy"}',
                new Date().toISOString(),
              ],
            ]
          : [],
      };
    }

    throw new Error(`Unexpected ES|QL query in integration test: ${query}`);
  });

  return {
    traceId,
    esClient: {
      esql: {
        query: esqlQuery,
      },
    } as unknown as TraceAccessor['esClient'],
  };
};

describe('trace groundedness evaluator integration', () => {
  it('derives GROUNDED and MAJOR_HALLUCINATIONS from trace evidence', async () => {
    const prompt = jest
      .fn()
      .mockImplementation(async ({ input }: { input: { tool_call_history: string } }) => {
        const toolCalls = JSON.parse(input.tool_call_history) as Array<{
          tool_id?: string;
          tool_call_id?: string;
        }>;
        const grounded = toolCalls.some((toolCall) => toolCall.tool_id === 'health_check');

        const analysis: GroundednessAnalysis = grounded
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
            };

        return {
          toolCalls: [{ function: { arguments: analysis } }],
        };
      });

    const inferenceClient = { prompt } as unknown as BoundInferenceClient;
    const groundedResult = await groundednessEvaluator.evaluate({
      trace: createMockTraceAccessor({ traceId: 'grounded-trace-001', hasToolEvidence: true }),
      inferenceClient,
      log: logger,
    });

    expect(groundedResult.label).toBe('GROUNDED');
    expect(groundedResult.metadata?.evidence_source).toBe('trace');
    const groundedAnalysis = groundedResult.metadata?.analysis as Array<{
      evidence?: { tool_id?: string };
    }>;
    expect(groundedAnalysis.some((entry) => entry.evidence?.tool_id === 'health_check')).toBe(true);

    const hallucinatedResult = await groundednessEvaluator.evaluate({
      trace: createMockTraceAccessor({ traceId: 'hallucinated-trace-001', hasToolEvidence: false }),
      inferenceClient,
      log: logger,
    });
    expect(hallucinatedResult.label).toBe('MAJOR_HALLUCINATIONS');
  });

  it('enforces manage privilege in evaluator execute route security config', async () => {
    const router = httpServiceMock.createRouter();
    const versionedRouter = router.versioned as MockedVersionedRouter;

    const evaluatorRegistry: EvaluatorRegistry = {
      list: () => [],
      get: () => undefined,
    };

    registerExecuteEvaluatorRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry,
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

    const route = versionedRouter.getRoute('post', EVALS_EVALUATOR_EVALUATE_URL);
    const { handler } = route.versions[API_VERSIONS.internal.v1];
    const response = await handler(
      {} as Parameters<typeof handler>[0],
      {
        params: { evaluatorName: 'groundedness' },
        body: { trace_id: 'grounded-trace-001', connector_id: 'connector-1' },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );
    expect(response.status).toBe(404);
  });
});

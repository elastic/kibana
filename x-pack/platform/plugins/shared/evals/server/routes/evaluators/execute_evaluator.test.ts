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
import { API_VERSIONS, EVALS_EVALUATOR_EVALUATE_URL } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { EvaluatorDefinition, EvaluatorRegistry } from '../../evaluators/types';
import { registerExecuteEvaluatorRoute } from './execute_evaluator';

describe('POST /internal/evals/evaluators/{evaluatorName}/_evaluate', () => {
  const buildEvaluator = (overrides: Partial<EvaluatorDefinition> = {}): EvaluatorDefinition => ({
    name: 'groundedness',
    version: '1.0.0',
    kind: 'llm',
    description: 'Groundedness evaluator',
    supportedInputs: ['trace', 'reference_data'],
    evaluate: jest.fn().mockResolvedValue({
      score: 1,
      label: 'GROUNDED',
      metadata: { evidence_source: 'trace' },
    }),
    ...overrides,
  });

  const buildEvaluatorRegistry = (definition?: EvaluatorDefinition): EvaluatorRegistry => ({
    list: () => (definition ? [definition] : []),
    get: (name: string) => (definition && definition.name === name ? definition : undefined),
  });

  const setup = ({
    evaluatorRegistry,
    inferenceStart,
  }: {
    evaluatorRegistry?: EvaluatorRegistry;
    inferenceStart?: InferenceServerStart;
  }) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const versionedRouter = router.versioned as MockedVersionedRouter;

    registerExecuteEvaluatorRoute({
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

    const route = versionedRouter.getRoute('post', EVALS_EVALUATOR_EVALUATE_URL);
    const routeConfig = versionedRouter.post.mock.calls[0][0];
    const { handler } = route.versions[API_VERSIONS.internal.v1];

    return { handler, routeConfig, logger };
  };

  it('registers manage privilege authz requirement', () => {
    const { routeConfig } = setup({
      evaluatorRegistry: buildEvaluatorRegistry(buildEvaluator()),
    });

    expect(routeConfig.security).toEqual({
      authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
    });
  });

  it('returns 404 for unknown evaluator names', async () => {
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry(),
      inferenceStart: {
        getClient: jest.fn(),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      {} as Parameters<typeof handler>[0],
      {
        params: { evaluatorName: 'missing' },
        body: { trace_id: 'trace-1' },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({ message: 'Evaluator not found: missing' });
  });

  it('returns 400 when connector_id is missing for llm evaluators', async () => {
    const groundedness = buildEvaluator();
    const { handler } = setup({
      evaluatorRegistry: buildEvaluatorRegistry(groundedness),
      inferenceStart: {
        getClient: jest.fn(),
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      {} as Parameters<typeof handler>[0],
      {
        params: { evaluatorName: 'groundedness' },
        body: { trace_id: 'trace-1' },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({
      message: 'connector_id is required for llm evaluators',
    });
  });

  it('executes evaluator and returns wrapped response body', async () => {
    const evaluate = jest.fn().mockResolvedValue({
      score: 0.5,
      label: 'MINOR_HALLUCINATIONS',
      metadata: { evidence_source: 'trace' },
    });
    const groundedness = buildEvaluator({ evaluate });
    const getClient = jest.fn().mockReturnValue({
      prompt: jest.fn(),
    });
    const { handler, logger } = setup({
      evaluatorRegistry: buildEvaluatorRegistry(groundedness),
      inferenceStart: {
        getClient,
      } as unknown as InferenceServerStart,
    });

    const response = await handler(
      {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asInternalUser: {
                esql: { query: jest.fn() },
              },
            },
          },
        }),
      } as unknown as Parameters<typeof handler>[0],
      {
        params: { evaluatorName: 'groundedness' },
        body: {
          connector_id: 'connector-123',
          trace_id: 'trace-123',
          reference_data: { question: 'status?' },
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(getClient).toHaveBeenCalledWith({
      request: expect.any(Object),
      bindTo: { connectorId: 'connector-123' },
    });
    expect(evaluate).toHaveBeenCalledWith({
      trace: expect.objectContaining({ traceId: 'trace-123' }),
      referenceData: { question: 'status?' },
      inferenceClient: expect.any(Object),
      log: logger,
    });
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      evaluator: {
        name: 'groundedness',
        version: '1.0.0',
        kind: 'llm',
      },
      score: 0.5,
      label: 'MINOR_HALLUCINATIONS',
      metadata: { evidence_source: 'trace' },
    });
  });
});

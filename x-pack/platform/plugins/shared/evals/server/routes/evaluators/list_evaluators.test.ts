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
import { API_VERSIONS, EVALS_EVALUATORS_URL } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { z } from '@kbn/zod/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import type { EvaluatorRegistry } from '../../evaluators/types';
import { registerListEvaluatorsRoute } from './list_evaluators';

describe('GET /internal/evals/evaluators', () => {
  const buildEvaluatorRegistry = (): EvaluatorRegistry =>
    createEvaluatorRegistryMock([
      {
        name: 'groundedness',
        version: '1.0.0',
        kind: 'llm',
        origin: 'built_in',
        description: 'Groundedness evaluator',
        direction: 'maximize',
        evidenceSchema: z.object({
          input: z.object({ message: z.string().min(1) }),
          response: z.object({ message: z.string().min(1) }),
          steps: z.array(z.object({}).catchall(z.unknown())),
        }),
        evaluate: jest.fn(),
      },
      {
        name: 'latency',
        version: '1.0.0',
        kind: 'code',
        origin: 'built_in',
        description: 'Latency evaluator',
        direction: 'minimize',
        evaluate: jest.fn(),
      },
      {
        name: 'input_tokens',
        version: '1.0.0',
        kind: 'code',
        origin: 'built_in',
        description: 'Input tokens evaluator',
        direction: 'minimize',
        evaluate: jest.fn(),
      },
      {
        name: 'output_tokens',
        version: '1.0.0',
        kind: 'code',
        origin: 'built_in',
        description: 'Output tokens evaluator',
        direction: 'minimize',
        evaluate: jest.fn(),
      },
      {
        name: 'tool_calls',
        version: '1.0.0',
        kind: 'code',
        origin: 'built_in',
        description: 'Tool calls evaluator',
        direction: 'neutral',
        evaluate: jest.fn(),
      },
      {
        name: 'correctness',
        version: '1.0.0',
        kind: 'llm',
        origin: 'built_in',
        description: 'Correctness evaluator',
        direction: 'maximize',
        referenceDataSchema: z.object({
          expected: z
            .string()
            .trim()
            .min(1)
            .describe('The expected ground truth response to compare against.'),
        }),
        evaluate: jest.fn(),
      },
      {
        name: 'tone',
        version: '1.2.0',
        kind: 'llm',
        origin: 'user_defined',
        description: 'Tone evaluator',
        direction: 'maximize',
        evaluate: jest.fn(),
      },
    ]);

  const setup = ({
    evaluatorRegistry,
    spaceId,
  }: { evaluatorRegistry?: EvaluatorRegistry; spaceId?: string } = {}) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const getSpaceId = spaceId ? jest.fn().mockResolvedValue(spaceId) : undefined;
    const versionedRouter = router.versioned as MockedVersionedRouter;
    registerListEvaluatorsRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: evaluatorRegistry ?? buildEvaluatorRegistry(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId,
    });

    const route = versionedRouter.getRoute('get', EVALS_EVALUATORS_URL);
    const routeConfig = versionedRouter.get.mock.calls[0][0];
    const { handler } = route.versions[API_VERSIONS.internal.v1];

    return { route, routeConfig, handler, logger, getSpaceId };
  };

  it('registers read privilege authz requirement', () => {
    const { routeConfig } = setup({ evaluatorRegistry: buildEvaluatorRegistry() });

    expect(routeConfig.security).toEqual({
      authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
    });
  });

  it('returns all evaluator definitions with API field names', async () => {
    const { handler } = setup({ evaluatorRegistry: buildEvaluatorRegistry() });

    const response = await handler(
      {} as Parameters<typeof handler>[0],
      {} as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.evaluators).toHaveLength(7);
    expect(response.payload.evaluators[0]).toEqual({
      name: 'groundedness',
      version: '1.0.0',
      kind: 'llm',
      origin: 'built_in',
      description: 'Groundedness evaluator',
      evidence_schema: expect.objectContaining({
        properties: expect.objectContaining({
          input: expect.objectContaining({ type: 'object' }),
          response: expect.objectContaining({ type: 'object' }),
          steps: expect.objectContaining({ type: 'array' }),
        }),
      }),
    });

    const correctnessEval = response.payload.evaluators.find(
      (e: { name: string }) => e.name === 'correctness'
    );
    expect(correctnessEval).toMatchObject({
      name: 'correctness',
      version: '1.0.0',
      kind: 'llm',
      origin: 'built_in',
      description: 'Correctness evaluator',
      reference_data_schema: expect.objectContaining({
        properties: expect.objectContaining({
          expected: expect.objectContaining({
            type: 'string',
            description: 'The expected ground truth response to compare against.',
          }),
        }),
        required: ['expected'],
      }),
    });
  });

  it('lists evaluators from the active space', async () => {
    const evaluatorRegistry = buildEvaluatorRegistry();
    const asScoped = jest.spyOn(evaluatorRegistry, 'asScoped');
    const { handler, getSpaceId } = setup({ evaluatorRegistry, spaceId: 'marketing' });
    const request = {} as Parameters<typeof handler>[1];

    const response = await handler(
      {} as Parameters<typeof handler>[0],
      request,
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(asScoped).toHaveBeenCalledWith({ spaceId: 'marketing' });
  });

  it('marks persisted evaluators as user-defined', async () => {
    const { handler } = setup();

    const response = await handler(
      {} as Parameters<typeof handler>[0],
      {} as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.payload.evaluators.find((e: { name: string }) => e.name === 'tone')).toEqual({
      name: 'tone',
      version: '1.2.0',
      kind: 'llm',
      origin: 'user_defined',
      description: 'Tone evaluator',
    });
  });
});

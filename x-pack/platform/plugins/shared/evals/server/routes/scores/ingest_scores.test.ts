/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import {
  API_VERSIONS,
  EVALS_SCORES_URL,
  IngestScoresRequestBody,
  type IngestScoresRequestBodyInput,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WriteResult } from '../../storage/scores/evaluation_score_service';
import { registerIngestScoresRoute } from './ingest_scores';

const getBasePayload = (): IngestScoresRequestBodyInput => ({
  experiment_id: 'experiment-1',
  task_model: {
    id: 'task-model-1',
    family: 'family-a',
    provider: 'provider-a',
  },
  evaluator_model: {
    id: 'evaluator-model-1',
    family: 'family-b',
    provider: 'provider-b',
  },
  metadata: {
    execution_id: 'experiment-1',
    suite_id: 'suite-1',
    total_repetitions: 1,
    hostname: 'localhost',
    git: {
      branch: 'main',
      commit_sha: 'abc123',
    },
  },
  scores: [
    {
      example: {
        id: 'example-1',
        index: 0,
        input: { prompt: 'hello' },
        dataset: {
          id: 'dataset-1',
          name: 'Dataset 1',
        },
      },
      task: {
        trace_id: 'trace-1',
        repetition_index: 0,
        output: { answer: 'world' },
      },
      evaluator: {
        name: 'quality',
        score: 1,
        label: 'pass',
        explanation: 'looks good',
        metadata: { source: 'unit-test' },
        trace_id: 'eval-trace-1',
      },
    },
  ],
});

describe('POST /internal/evals/scores', () => {
  const setup = (options?: { getSpaceId?: jest.Mock; checkManageEvalsPrivileges?: jest.Mock }) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerIngestScoresRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId: options?.getSpaceId,
      checkManageEvalsPrivileges: options?.checkManageEvalsPrivileges,
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const route = versionedRouter.getRoute('post', EVALS_SCORES_URL).versions[
      API_VERSIONS.internal.v1
    ];
    const { handler } = route;

    const evaluationScoreService = {
      write: jest.fn().mockResolvedValue({ ingested: 1, conflicted: 0, failed: [] }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        evaluationScoreService,
      } as any,
    });

    return { handler, context, evaluationScoreService, route };
  };

  const makeRequest = (body: IngestScoresRequestBodyInput) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_SCORES_URL,
      body,
    });

  const mockWriteResult = (
    evaluationScoreService: { write: jest.Mock },
    result: WriteResult
  ): void => {
    evaluationScoreService.write.mockResolvedValueOnce(result);
  };

  it('returns 200 with ingest counts on successful ingest', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = getBasePayload();
    mockWriteResult(evaluationScoreService, { ingested: 1, conflicted: 0, failed: [] });

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(evaluationScoreService.write).toHaveBeenCalledWith(payload, ['default']);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ ingested: 1, conflicted: 0, failed: [] });
  });

  it('stamps scores with the active space when no space_ids are provided', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const { handler, context, evaluationScoreService } = setup({ getSpaceId });
    const payload = getBasePayload();

    await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(evaluationScoreService.write).toHaveBeenCalledWith(payload, ['marketing']);
  });

  it('honors explicit space_ids over the active space when the caller is authorized', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(true);
    const { handler, context, evaluationScoreService } = setup({
      getSpaceId,
      checkManageEvalsPrivileges,
    });
    const payload = { ...getBasePayload(), space_ids: ['sales', 'ops'] };

    await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    // Only spaces other than the active one need an explicit cross-space privilege check.
    expect(checkManageEvalsPrivileges).toHaveBeenCalledWith(expect.anything(), ['sales', 'ops']);
    expect(evaluationScoreService.write).toHaveBeenCalledWith(payload, ['sales', 'ops']);
  });

  it('does not run a cross-space privilege check when the only target is the active space', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(true);
    const { handler, context, evaluationScoreService } = setup({
      getSpaceId,
      checkManageEvalsPrivileges,
    });
    const payload = { ...getBasePayload(), space_ids: ['marketing'] };

    await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(checkManageEvalsPrivileges).not.toHaveBeenCalled();
    expect(evaluationScoreService.write).toHaveBeenCalledWith(payload, ['marketing']);
  });

  it('returns 403 and does not write when the caller lacks privileges in a target space', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(false);
    const { handler, context, evaluationScoreService } = setup({
      getSpaceId,
      checkManageEvalsPrivileges,
    });
    const payload = { ...getBasePayload(), space_ids: ['sales', 'ops'] };

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(403);
    expect(checkManageEvalsPrivileges).toHaveBeenCalledWith(expect.anything(), ['sales', 'ops']);
    expect(evaluationScoreService.write).not.toHaveBeenCalled();
  });

  it('fails closed with 403 for cross-space writes when no privilege checker is wired', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const { handler, context, evaluationScoreService } = setup({ getSpaceId });
    const payload = { ...getBasePayload(), space_ids: ['sales'] };

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(403);
    expect(evaluationScoreService.write).not.toHaveBeenCalled();
  });

  it('rejects assigning scores to all spaces (*) with 400', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = { ...getBasePayload(), space_ids: ['*'] };

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(evaluationScoreService.write).not.toHaveBeenCalled();
  });

  it('returns 200 with conflicted count when payload is fully idempotent', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = getBasePayload();
    mockWriteResult(evaluationScoreService, { ingested: 0, conflicted: 1, failed: [] });

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ ingested: 0, conflicted: 1, failed: [] });
  });

  it('returns 207 for partial success with non-conflict failures', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = getBasePayload();
    mockWriteResult(evaluationScoreService, {
      ingested: 1,
      conflicted: 0,
      failed: [{ index: 0, status: 400, reason: 'mapper parsing failed' }],
    });

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(207);
    expect(response.payload).toEqual({
      ingested: 1,
      conflicted: 0,
      failed: [{ index: 0, status: 400, reason: 'mapper parsing failed' }],
    });
  });

  it('returns 400 when nothing landed and all failures are mapping/validation', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = getBasePayload();
    mockWriteResult(evaluationScoreService, {
      ingested: 0,
      conflicted: 0,
      failed: [
        { index: 0, status: 400, reason: 'mapping rejected' },
        { index: 1, status: 400, reason: 'strict_dynamic_mapping_exception' },
      ],
    });

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({
      ingested: 0,
      conflicted: 0,
      failed: [
        { index: 0, status: 400, reason: 'mapping rejected' },
        { index: 1, status: 400, reason: 'strict_dynamic_mapping_exception' },
      ],
    });
  });

  it('returns 500 when nothing landed and failures include a 404', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = getBasePayload();
    mockWriteResult(evaluationScoreService, {
      ingested: 0,
      conflicted: 0,
      failed: [{ index: 0, status: 404, reason: 'index missing' }],
    });

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({
      ingested: 0,
      conflicted: 0,
      failed: [{ index: 0, status: 404, reason: 'index missing' }],
    });
  });

  it('returns 429 when nothing landed and any failure is rate-limited', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = getBasePayload();
    mockWriteResult(evaluationScoreService, {
      ingested: 0,
      conflicted: 0,
      failed: [{ index: 0, status: 429, reason: 'too many requests' }],
    });

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(429);
    expect(response.payload).toEqual({
      ingested: 0,
      conflicted: 0,
      failed: [{ index: 0, status: 429, reason: 'too many requests' }],
    });
  });

  it('returns 500 when nothing landed and failures are transient/unknown', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = getBasePayload();
    mockWriteResult(evaluationScoreService, {
      ingested: 0,
      conflicted: 0,
      failed: [{ index: 0, status: 503, reason: 'es unavailable' }],
    });

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({
      ingested: 0,
      conflicted: 0,
      failed: [{ index: 0, status: 503, reason: 'es unavailable' }],
    });
  });

  it('fails validation when experiment_id is missing', () => {
    const payload = getBasePayload();
    const { experiment_id: _experimentId, ...invalidPayload } = payload;

    const result = IngestScoresRequestBody.safeParse(invalidPayload);

    expect(result.success).toBe(false);
  });

  it('accepts a per-score evaluator model and kind', () => {
    const payload = getBasePayload();
    const result = IngestScoresRequestBody.safeParse({
      ...payload,
      scores: [
        {
          ...payload.scores[0],
          evaluator: {
            ...payload.scores[0].evaluator,
            version: '1.2.0',
            kind: 'llm',
            model: { id: 'gpt-4o', family: 'GPT', provider: 'OpenAI' },
          },
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.scores[0].evaluator).toMatchObject({
      version: '1.2.0',
      kind: 'llm',
      model: { id: 'gpt-4o', family: 'GPT', provider: 'OpenAI' },
    });
  });

  it('accepts scores that omit the evaluator model and kind', () => {
    const result = IngestScoresRequestBody.safeParse(getBasePayload());

    expect(result.success).toBe(true);
    expect(result.data?.scores[0].evaluator.model).toBeUndefined();
    expect(result.data?.scores[0].evaluator.kind).toBeUndefined();
  });

  it('rejects an evaluator kind outside llm and code', () => {
    const payload = getBasePayload();
    const result = IngestScoresRequestBody.safeParse({
      ...payload,
      scores: [
        {
          ...payload.scores[0],
          evaluator: { ...payload.scores[0].evaluator, kind: 'heuristic' },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('fails validation when more than 1000 scores are provided', () => {
    const payload = getBasePayload();
    const score = payload.scores[0];
    const oversizedPayload = {
      ...payload,
      scores: Array.from({ length: 1001 }, () => score),
    };

    const result = IngestScoresRequestBody.safeParse(oversizedPayload);

    expect(result.success).toBe(false);
  });

  it('registers the route with a 5MB body cap', () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();

    registerIngestScoresRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const routeConfig = versionedRouter.post.mock.calls[0][0];

    expect(routeConfig.options?.body?.maxBytes).toBe(5 * 1024 * 1024);
  });

  it('returns 500 with error message when service throws', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const payload = getBasePayload();
    evaluationScoreService.write.mockRejectedValueOnce(
      new Error('First error: 500 mapper_parsing_exception: bad field')
    );

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({
      message: 'First error: 500 mapper_parsing_exception: bad field',
    });
  });
});

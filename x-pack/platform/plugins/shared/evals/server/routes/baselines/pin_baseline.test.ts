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
import { EVALS_BASELINES_PIN_URL, API_VERSIONS } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import { registerPinBaselineRoute, MAX_PINNABLE_SCORES } from './pin_baseline';

const scoreSource = ({
  judgeModelId = 'glm-5.2',
  evaluatorKind = 'llm',
}: { judgeModelId?: string; evaluatorKind?: string } = {}) => ({
  '@timestamp': '2026-11-01T00:00:00.000Z',
  experiment_id: 'exp-1',
  space_ids: ['default'],
  example: { id: 'example-1', index: 1, dataset: { id: 'dataset-1', name: 'Dataset 1' } },
  task: {
    repetition_index: 0,
    model: { id: 'gpt-5', family: 'gpt', provider: 'openai' },
  },
  evaluator: {
    name: 'correctness',
    score: 0.8,
    kind: evaluatorKind,
    ...(evaluatorKind === 'llm' && { model: { id: judgeModelId, family: 'glm', provider: 'zai' } }),
  },
  metadata: {
    execution_id: 'bk-1::suite-1::gpt-5',
    suite_id: 'suite-1',
    git: { branch: 'main', commit_sha: 'abc123' },
  },
});

describe('POST /internal/evals/baselines/_pin', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerPinBaselineRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId: async () => 'space-a',
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('post', EVALS_BASELINES_PIN_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } }),
    };
    const pinnedBaselineService = {
      pin: jest.fn(),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        evaluationScoreService,
        pinnedBaselineService,
      } as any,
    });

    return { handler, context, evaluationScoreService, pinnedBaselineService, logger };
  };

  const makeRequest = () =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_BASELINES_PIN_URL,
      body: {
        suite_id: 'suite-1',
        execution_id: 'bk-1::suite-1::gpt-5',
        reason: 'test pin',
        pinned_by: 'rakesh',
      },
    });

  it('returns 404 when the execution has no scores', async () => {
    const { handler, context } = setup();

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload.message).toContain('No scores found');
  });

  it('refuses a mixed-judge execution with 400', async () => {
    const { handler, context, evaluationScoreService, pinnedBaselineService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        total: { value: 2 },
        hits: [
          { _id: 'doc-1', _source: scoreSource({ judgeModelId: 'glm-5.2' }) },
          { _id: 'doc-2', _source: scoreSource({ judgeModelId: 'gemini-3.0' }) },
        ],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload.message).toContain('multiple judge models');
    expect(pinnedBaselineService.pin).not.toHaveBeenCalled();
  });

  it('refuses to pin when the execution has more scores than the snapshot can hold', async () => {
    const { handler, context, evaluationScoreService, pinnedBaselineService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        total: { value: MAX_PINNABLE_SCORES + 1 },
        hits: [{ _id: 'doc-1', _source: scoreSource() }],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload.message).toContain(`${MAX_PINNABLE_SCORES}`);
    expect(pinnedBaselineService.pin).not.toHaveBeenCalled();
  });

  it('pins the execution with judge/task-model attribution and Space scoping', async () => {
    const { handler, context, evaluationScoreService, pinnedBaselineService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        total: { value: 2 },
        hits: [
          { _id: 'doc-1', _source: scoreSource() },
          { _id: 'doc-2', _source: scoreSource({ evaluatorKind: 'deterministic' }) },
        ],
      },
    } as any);
    pinnedBaselineService.pin.mockResolvedValueOnce({ baseline_id: 'baseline-1' });

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(evaluationScoreService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: MAX_PINNABLE_SCORES,
        track_total_hits: true,
      })
    );
    expect(pinnedBaselineService.pin).toHaveBeenCalledWith(
      expect.objectContaining({
        pointer: expect.objectContaining({
          suite_id: 'suite-1',
          execution_id: 'bk-1::suite-1::gpt-5',
          judge_model_id: 'glm-5.2',
          task_model: expect.objectContaining({ id: 'gpt-5' }),
          git_branch: 'main',
          git_commit_sha: 'abc123',
          pinned_by: 'rakesh',
          reason: 'test pin',
        }),
        spaceIds: ['space-a'],
      })
    );
  });

  it('returns 500 when pinning fails', async () => {
    const { handler, context, evaluationScoreService, pinnedBaselineService, logger } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { total: { value: 1 }, hits: [{ _id: 'doc-1', _source: scoreSource() }] },
    } as any);
    pinnedBaselineService.pin.mockRejectedValueOnce(new Error('ES down'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});

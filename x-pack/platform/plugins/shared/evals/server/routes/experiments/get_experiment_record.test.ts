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
import { API_VERSIONS, EVALS_EXPERIMENT_RECORD_URL } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import type { ExperimentRecordDocument } from '../../storage/experiments/experiment_record_client';
import { registerGetExperimentRecordRoute } from './get_experiment_record';

const getStoredRecord = (): ExperimentRecordDocument => ({
  id: 'record-1',
  experiment_id: 'experiment-1',
  name: 'My experiment',
  description: 'Nightly run',
  protocol: {
    dataset: { id: 'dataset-1', name: 'Dataset 1', examples_count: 10 },
    task: { model: { id: 'task-model-1', family: 'family-a', provider: 'provider-a' } },
    evaluators: [
      { name: 'quality', version: '1.0.0', kind: 'llm', model: { id: 'judge-model-1' } },
      { name: 'exact-match', kind: 'code' },
    ],
    total_repetitions: 2,
  },
  status: 'completed',
  started_at: '2026-08-30T10:00:00.000Z',
  completed_at: '2026-08-30T10:05:00.000Z',
  provenance: { execution_id: 'execution-1', hostname: 'localhost' },
  completeness: { successful_tasks: 20, failed_tasks: 0 },
  space_ids: ['default'],
  created_at: '2026-08-30T10:00:00.000Z',
  updated_at: '2026-08-30T10:05:00.000Z',
});

describe('GET /internal/evals/experiments/{experimentId}/_record', () => {
  const setup = (options?: { getSpaceId?: jest.Mock }) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetExperimentRecordRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId: options?.getSpaceId,
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_EXPERIMENT_RECORD_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const recordClient = {
      get: jest.fn().mockResolvedValue(getStoredRecord()),
    };
    const experimentRecordService = {
      getClient: jest.fn().mockReturnValue(recordClient),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        experimentRecordService,
      } as any,
    });

    return { handler, context, recordClient, experimentRecordService };
  };

  const makeRequest = (experimentId = 'experiment-1') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EXPERIMENT_RECORD_URL,
      params: { experimentId },
    });

  it('returns the stored record from the active space without space assignments', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const { handler, context, recordClient, experimentRecordService } = setup({ getSpaceId });

    const response = await handler(context as any, makeRequest(), kibanaResponseFactory);

    expect(experimentRecordService.getClient).toHaveBeenCalledWith({ spaceId: 'marketing' });
    expect(recordClient.get).toHaveBeenCalledWith('experiment-1');
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      id: 'record-1',
      experiment_id: 'experiment-1',
      name: 'My experiment',
      description: 'Nightly run',
      protocol: {
        dataset: { id: 'dataset-1', name: 'Dataset 1', examples_count: 10 },
        task: { model: { id: 'task-model-1', family: 'family-a', provider: 'provider-a' } },
        evaluators: [
          { name: 'quality', version: '1.0.0', kind: 'llm', model: { id: 'judge-model-1' } },
          { name: 'exact-match', kind: 'code' },
        ],
        total_repetitions: 2,
      },
      status: 'completed',
      started_at: '2026-08-30T10:00:00.000Z',
      completed_at: '2026-08-30T10:05:00.000Z',
      provenance: { execution_id: 'execution-1', hostname: 'localhost' },
      completeness: { successful_tasks: 20, failed_tasks: 0 },
      created_at: '2026-08-30T10:00:00.000Z',
      updated_at: '2026-08-30T10:05:00.000Z',
    });
  });

  it('falls back to the default space when no space resolver is wired', async () => {
    const { handler, context, experimentRecordService } = setup();

    await handler(context as any, makeRequest(), kibanaResponseFactory);

    expect(experimentRecordService.getClient).toHaveBeenCalledWith({ spaceId: 'default' });
  });

  it('returns 404 when no record exists for the experiment in this space', async () => {
    const { handler, context, recordClient } = setup();
    recordClient.get.mockResolvedValueOnce(undefined);

    const response = await handler(
      context as any,
      makeRequest('experiment-missing'),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Experiment record for experiment "experiment-missing" was not found',
    });
  });

  it('returns 500 when the storage client fails', async () => {
    const { handler, context, recordClient } = setup();
    recordClient.get.mockRejectedValueOnce(new Error('es unavailable'));

    const response = await handler(context as any, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({ message: 'Failed to get experiment record' });
  });
});

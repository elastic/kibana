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
  EVALS_EXPERIMENT_RECORD_FINALIZE_URL,
  FinalizeEvaluationExperimentRecordRequestBody,
  type FinalizeEvaluationExperimentRecordRequestBodyInput,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import { ExperimentRecordNotFoundError } from '../../storage/experiments/experiment_record_not_found_error';
import type { ExperimentRecordDocument } from '../../storage/experiments/experiment_record_client';
import { registerFinalizeExperimentRecordRoute } from './finalize_experiment_record';

const getBasePayload = (): FinalizeEvaluationExperimentRecordRequestBodyInput => ({
  status: 'completed',
  completeness: { successful_tasks: 10, failed_tasks: 0, score_ingest_failures: 0 },
});

const getFinalizedRecord = (): ExperimentRecordDocument => ({
  id: 'record-1',
  experiment_id: 'experiment-1',
  name: 'My experiment',
  protocol: { dataset: { id: 'dataset-1', name: 'Dataset 1' } },
  status: 'completed',
  started_at: '2026-08-30T10:00:00.000Z',
  completed_at: '2026-08-30T10:05:00.000Z',
  completeness: { successful_tasks: 10, failed_tasks: 0, score_ingest_failures: 0 },
  space_ids: ['default'],
  created_at: '2026-08-30T10:00:00.000Z',
  updated_at: '2026-08-30T10:05:00.000Z',
});

describe('POST /internal/evals/experiments/{experimentId}/_record/_finalize', () => {
  const setup = (options?: { getSpaceId?: jest.Mock }) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerFinalizeExperimentRecordRoute({
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
    const { handler } = versionedRouter.getRoute('post', EVALS_EXPERIMENT_RECORD_FINALIZE_URL)
      .versions[API_VERSIONS.internal.v1];

    const recordClient = {
      update: jest.fn().mockResolvedValue(getFinalizedRecord()),
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

  const makeRequest = (body: FinalizeEvaluationExperimentRecordRequestBodyInput) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_EXPERIMENT_RECORD_FINALIZE_URL,
      params: { experimentId: 'experiment-1' },
      body,
    });

  it('applies the terminal status in the active space and returns the record', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const { handler, context, recordClient, experimentRecordService } = setup({ getSpaceId });
    const payload = getBasePayload();

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(experimentRecordService.getClient).toHaveBeenCalledWith({ spaceId: 'marketing' });
    expect(recordClient.update).toHaveBeenCalledWith('experiment-1', {
      status: 'completed',
      completeness: payload.completeness,
      error: undefined,
      completedAt: undefined,
    });
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      id: 'record-1',
      experiment_id: 'experiment-1',
      name: 'My experiment',
      protocol: { dataset: { id: 'dataset-1', name: 'Dataset 1' } },
      status: 'completed',
      started_at: '2026-08-30T10:00:00.000Z',
      completed_at: '2026-08-30T10:05:00.000Z',
      completeness: { successful_tasks: 10, failed_tasks: 0, score_ingest_failures: 0 },
      created_at: '2026-08-30T10:00:00.000Z',
      updated_at: '2026-08-30T10:05:00.000Z',
    });
  });

  it('passes failure details through to the storage client', async () => {
    const { handler, context, recordClient } = setup();
    const payload: FinalizeEvaluationExperimentRecordRequestBodyInput = {
      status: 'failed',
      error: 'connector timed out',
      completed_at: '2026-08-30T10:04:00.000Z',
    };

    await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(recordClient.update).toHaveBeenCalledWith('experiment-1', {
      status: 'failed',
      completeness: undefined,
      error: 'connector timed out',
      completedAt: '2026-08-30T10:04:00.000Z',
    });
  });

  it('returns 404 when no record exists for the experiment', async () => {
    const { handler, context, recordClient } = setup();
    recordClient.update.mockRejectedValueOnce(new ExperimentRecordNotFoundError('experiment-1'));

    const response = await handler(
      context as any,
      makeRequest(getBasePayload()),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Experiment record for experiment "experiment-1" was not found',
    });
  });

  it('returns 500 when the storage client fails', async () => {
    const { handler, context, recordClient } = setup();
    recordClient.update.mockRejectedValueOnce(new Error('es unavailable'));

    const response = await handler(
      context as any,
      makeRequest(getBasePayload()),
      kibanaResponseFactory
    );

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({ message: 'Failed to finalize experiment record' });
  });

  it('only accepts terminal statuses at validation', () => {
    expect(FinalizeEvaluationExperimentRecordRequestBody.safeParse(getBasePayload()).success).toBe(
      true
    );
    expect(
      FinalizeEvaluationExperimentRecordRequestBody.safeParse({ status: 'failed' }).success
    ).toBe(true);
    expect(
      FinalizeEvaluationExperimentRecordRequestBody.safeParse({ status: 'running' }).success
    ).toBe(false);
    expect(FinalizeEvaluationExperimentRecordRequestBody.safeParse({}).success).toBe(false);
  });
});

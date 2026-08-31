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
  EVALS_EXPERIMENT_RECORD_URL,
  CreateEvaluationExperimentRecordRequestBody,
  type CreateEvaluationExperimentRecordRequestBodyInput,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import { ExperimentRecordAlreadyExistsError } from '../../storage/experiments/experiment_record_already_exists_error';
import type { ExperimentRecordDocument } from '../../storage/experiments/experiment_record_client';
import { registerCreateExperimentRecordRoute } from './create_experiment_record';

const getBasePayload = (): CreateEvaluationExperimentRecordRequestBodyInput => ({
  name: 'My experiment',
  description: 'Nightly run',
  protocol: {
    dataset: { id: 'dataset-1', name: 'Dataset 1', examples_count: 10 },
    task: { model: { id: 'task-model-1', family: 'family-a', provider: 'provider-a' } },
    evaluators: [
      {
        name: 'quality',
        version: '1.0.0',
        kind: 'llm',
        model: { id: 'judge-model-1' },
      },
      { name: 'exact-match', kind: 'code' },
    ],
    total_repetitions: 2,
  },
  provenance: {
    execution_id: 'execution-1',
    suite_id: 'suite-1',
    hostname: 'localhost',
    git: { branch: 'main', commit_sha: 'abc123' },
  },
});

const getStoredRecord = (): ExperimentRecordDocument => ({
  id: 'record-1',
  experiment_id: 'experiment-1',
  name: 'My experiment',
  description: 'Nightly run',
  protocol: {
    dataset: { id: 'dataset-1', name: 'Dataset 1', examples_count: 10 },
    total_repetitions: 2,
  },
  status: 'running',
  started_at: '2026-08-30T10:00:00.000Z',
  provenance: { execution_id: 'execution-1', hostname: 'localhost' },
  space_ids: ['default'],
  created_at: '2026-08-30T10:00:00.000Z',
  updated_at: '2026-08-30T10:00:00.000Z',
});

describe('POST /internal/evals/experiments/{experimentId}/_record', () => {
  const setup = (options?: { getSpaceId?: jest.Mock; checkManageEvalsPrivileges?: jest.Mock }) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerCreateExperimentRecordRoute({
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
    const { handler } = versionedRouter.getRoute('post', EVALS_EXPERIMENT_RECORD_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const recordClient = {
      create: jest.fn().mockResolvedValue(getStoredRecord()),
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

  const makeRequest = (body: CreateEvaluationExperimentRecordRequestBodyInput) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_EXPERIMENT_RECORD_URL,
      params: { experimentId: 'experiment-1' },
      body,
    });

  it('creates the record in the active space and returns it without space assignments', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const { handler, context, recordClient, experimentRecordService } = setup({ getSpaceId });
    const payload = getBasePayload();

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(experimentRecordService.getClient).toHaveBeenCalledWith({ spaceId: 'marketing' });
    expect(recordClient.create).toHaveBeenCalledWith({
      experimentId: 'experiment-1',
      name: payload.name,
      description: payload.description,
      protocol: payload.protocol,
      provenance: payload.provenance,
      startedAt: undefined,
      spaceIds: undefined,
    });
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      id: 'record-1',
      experiment_id: 'experiment-1',
      name: 'My experiment',
      description: 'Nightly run',
      protocol: {
        dataset: { id: 'dataset-1', name: 'Dataset 1', examples_count: 10 },
        total_repetitions: 2,
      },
      status: 'running',
      started_at: '2026-08-30T10:00:00.000Z',
      provenance: { execution_id: 'execution-1', hostname: 'localhost' },
      created_at: '2026-08-30T10:00:00.000Z',
      updated_at: '2026-08-30T10:00:00.000Z',
    });
  });

  it('falls back to the default space when no space resolver is wired', async () => {
    const { handler, context, experimentRecordService } = setup();

    await handler(context as any, makeRequest(getBasePayload()), kibanaResponseFactory);

    expect(experimentRecordService.getClient).toHaveBeenCalledWith({ spaceId: 'default' });
  });

  it('passes explicit space_ids to the client when the caller is authorized', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(true);
    const { handler, context, recordClient } = setup({ getSpaceId, checkManageEvalsPrivileges });
    const payload = { ...getBasePayload(), space_ids: ['sales', 'ops'] };

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    // Only spaces other than the active one need an explicit cross-space privilege check.
    expect(checkManageEvalsPrivileges).toHaveBeenCalledWith(expect.anything(), ['sales', 'ops']);
    expect(recordClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ spaceIds: ['sales', 'ops'] })
    );
    expect(response.status).toBe(200);
  });

  it('does not run a cross-space privilege check when the only target is the active space', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(true);
    const { handler, context, recordClient } = setup({ getSpaceId, checkManageEvalsPrivileges });
    const payload = { ...getBasePayload(), space_ids: ['marketing'] };

    await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(checkManageEvalsPrivileges).not.toHaveBeenCalled();
    expect(recordClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ spaceIds: ['marketing'] })
    );
  });

  it('returns 403 and does not create when the caller lacks privileges in a target space', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(false);
    const { handler, context, recordClient } = setup({ getSpaceId, checkManageEvalsPrivileges });
    const payload = { ...getBasePayload(), space_ids: ['sales', 'ops'] };

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(403);
    expect(checkManageEvalsPrivileges).toHaveBeenCalledWith(expect.anything(), ['sales', 'ops']);
    expect(recordClient.create).not.toHaveBeenCalled();
  });

  it('fails closed with 403 for cross-space writes when no privilege checker is wired', async () => {
    const getSpaceId = jest.fn().mockResolvedValue('marketing');
    const { handler, context, recordClient } = setup({ getSpaceId });
    const payload = { ...getBasePayload(), space_ids: ['sales'] };

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(403);
    expect(recordClient.create).not.toHaveBeenCalled();
  });

  it('rejects assigning the record to all spaces (*) with 400', async () => {
    const { handler, context, recordClient } = setup();
    const payload = { ...getBasePayload(), space_ids: ['*'] };

    const response = await handler(context as any, makeRequest(payload), kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(recordClient.create).not.toHaveBeenCalled();
  });

  it('returns 409 when a record for the experiment already exists', async () => {
    const { handler, context, recordClient } = setup();
    recordClient.create.mockRejectedValueOnce(
      new ExperimentRecordAlreadyExistsError('experiment-1')
    );

    const response = await handler(
      context as any,
      makeRequest(getBasePayload()),
      kibanaResponseFactory
    );

    expect(response.status).toBe(409);
    expect(response.payload).toEqual({
      message: 'Experiment record for experiment "experiment-1" already exists',
    });
  });

  it('returns 500 when the storage client fails', async () => {
    const { handler, context, recordClient } = setup();
    recordClient.create.mockRejectedValueOnce(new Error('es unavailable'));

    const response = await handler(
      context as any,
      makeRequest(getBasePayload()),
      kibanaResponseFactory
    );

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({ message: 'Failed to create experiment record' });
  });

  it('takes no status; records are always created running', () => {
    // A status sent by an out-of-repo caller is stripped rather than rejected.
    const parsed = CreateEvaluationExperimentRecordRequestBody.safeParse({
      ...getBasePayload(),
      status: 'completed',
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty('status');
  });

  it('fails validation without a name or a protocol dataset', () => {
    const { name: _name, ...withoutName } = getBasePayload();
    expect(CreateEvaluationExperimentRecordRequestBody.safeParse(withoutName).success).toBe(false);

    const { protocol: _protocol, ...withoutProtocol } = getBasePayload();
    expect(CreateEvaluationExperimentRecordRequestBody.safeParse(withoutProtocol).success).toBe(
      false
    );
    expect(
      CreateEvaluationExperimentRecordRequestBody.safeParse({
        ...withoutProtocol,
        protocol: { task: {} },
      }).success
    ).toBe(false);
  });
});

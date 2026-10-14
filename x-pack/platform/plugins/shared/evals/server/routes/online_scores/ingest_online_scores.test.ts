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
  EVALS_ONLINE_SCORES_URL,
  type IngestOnlineScoresRequestBodyInput,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistry } from '../../evaluators/registry';
import { registerIngestOnlineScoresRoute } from './ingest_online_scores';

const getBasePayload = (): IngestOnlineScoresRequestBodyInput => ({
  monitor: {
    id: 'workflow-1',
    name: 'Online Eval Workflow',
  },
  trace_id: 'trace-1',
  connector_id: 'connector-1',
  results: [
    {
      status: 'ok',
      evaluator: {
        name: 'correctness',
        version: '1.0.0',
        kind: 'llm',
      },
      scores: [
        {
          name: 'factuality',
          score: 0.9,
          label: 'pass',
          explanation: 'looks good',
          metadata: { dimension: 'facts' },
        },
        {
          name: 'relevance',
          score: 0.8,
          label: 'pass',
        },
      ],
    },
    {
      status: 'error',
      evaluator: {
        name: 'toxicity',
        version: '2.0.0',
        kind: 'llm',
      },
      error: {
        message: 'evaluator timed out',
      },
    },
  ],
});

describe('POST /internal/evals/online_scores', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const getSpaceId = jest.fn().mockResolvedValue('space-a');
    registerIngestOnlineScoresRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId,
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const route = versionedRouter.getRoute('post', EVALS_ONLINE_SCORES_URL).versions[
      API_VERSIONS.internal.v1
    ];
    const { handler } = route;

    const onlineScoreService = {
      bulkCreate: jest.fn().mockResolvedValue({ created: 2, skipped: 0, errors: [] }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        onlineScoreService,
      } as any,
    });

    return { handler, context, onlineScoreService, logger, getSpaceId };
  };

  const makeRequest = (body: IngestOnlineScoresRequestBodyInput) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_ONLINE_SCORES_URL,
      body,
    });

  it('expands one document per score and counts failed evaluators', async () => {
    const { handler, context, onlineScoreService, getSpaceId } = setup();
    const request = makeRequest(getBasePayload());

    const response = await handler(context as any, request, kibanaResponseFactory);

    expect(onlineScoreService.bulkCreate).toHaveBeenCalledWith([
      {
        space_ids: ['space-a'],
        monitor: { id: 'workflow-1', name: 'Online Eval Workflow' },
        trace_id: 'trace-1',
        connector_id: 'connector-1',
        evaluator: { name: 'correctness', version: '1.0.0', kind: 'llm' },
        score: {
          name: 'factuality',
          value: 0.9,
          label: 'pass',
          explanation: 'looks good',
          metadata: { dimension: 'facts' },
        },
      },
      {
        space_ids: ['space-a'],
        monitor: { id: 'workflow-1', name: 'Online Eval Workflow' },
        trace_id: 'trace-1',
        connector_id: 'connector-1',
        evaluator: { name: 'correctness', version: '1.0.0', kind: 'llm' },
        score: {
          name: 'relevance',
          value: 0.8,
          label: 'pass',
          explanation: undefined,
          metadata: undefined,
        },
      },
    ]);
    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ created: 2, skipped: 0, failed_evaluators: 1 });
  });

  it('returns 500 when ingestion reports write errors', async () => {
    const { handler, context, onlineScoreService, logger } = setup();
    onlineScoreService.bulkCreate.mockResolvedValueOnce({
      created: 1,
      skipped: 0,
      errors: [{ index: 1, status: 400, reason: 'mapping rejected' }],
    });

    const response = await handler(
      context as any,
      makeRequest(getBasePayload()),
      kibanaResponseFactory
    );

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({ message: 'Failed to ingest online evaluation scores' });
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns a generic 500 response and logs details when the service throws', async () => {
    const { handler, context, onlineScoreService, logger } = setup();
    onlineScoreService.bulkCreate.mockRejectedValueOnce(new Error('boom'));

    const response = await handler(
      context as any,
      makeRequest(getBasePayload()),
      kibanaResponseFactory
    );

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({ message: 'Failed to ingest online evaluation scores' });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to ingest online evaluation scores: boom',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'boom', stack_trace: expect.any(String) }),
      })
    );
  });
});

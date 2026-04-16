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
import { API_VERSIONS } from '@kbn/evals-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExperimentSuiteRegistry } from '../../experiments/registry';
import { registerCancelExperimentRunRoute } from './post_cancel_run';

describe('POST /internal/evals/experiments/runs/{workflowExecutionId}/cancel', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const experimentSuiteRegistry = new ExperimentSuiteRegistry();
    const workflowsManagement: WorkflowsServerPluginSetup = {
      management: {
        cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
      } as any,
    };

    registerCancelExperimentRunRoute({
      router,
      logger,
      experimentSuiteRegistry,
      workflowsManagement,
      canEncrypt: true,
      getEncryptedSavedObjectsStart: jest.fn(),
      getInternalRemoteConfigsSoClient: jest.fn(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute(
      'post',
      '/internal/evals/experiments/runs/{workflowExecutionId}/cancel'
    ).versions[API_VERSIONS.internal.v1];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    (mockCoreContext as any).http = {
      basePath: {
        get: jest.fn().mockReturnValue('/s/default'),
      },
    };
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });

    return { handler, context, workflowsManagement };
  };

  it('cancels workflow execution', async () => {
    const { handler, context, workflowsManagement } = setup();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/evals/experiments/runs/exec-123/cancel',
      params: { workflowExecutionId: 'exec-123' },
    });

    const res = await handler(context, request, kibanaResponseFactory);
    expect(res.status).toBe(200);
    expect(workflowsManagement.management.cancelWorkflowExecution).toHaveBeenCalledWith(
      'exec-123',
      'default'
    );
  });
});

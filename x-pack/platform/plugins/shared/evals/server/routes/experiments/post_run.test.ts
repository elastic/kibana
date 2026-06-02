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
import { z } from '@kbn/zod';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExperimentSuiteRegistry } from '../../experiments/registry';
import { registerRunExperimentSuiteRoute } from './post_run';

describe('POST /internal/evals/experiments/runs', () => {
  const setup = (opts?: { withWorkflows?: boolean }) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const experimentSuiteRegistry = new ExperimentSuiteRegistry();
    experimentSuiteRegistry.register({
      id: 'suite-1',
      name: 'Suite 1',
      inputSchema: z.object({}),
      run: async () => undefined,
    });

    const workflowsManagement: WorkflowsServerPluginSetup | undefined = opts?.withWorkflows
      ? ({
          management: {
            getWorkflow: jest.fn().mockResolvedValue({
              id: 'wf-1',
              name: 'WF',
              valid: true,
              enabled: true,
              definition: { version: 1, steps: [] },
              yaml: 'name: WF',
            }),
            runWorkflow: jest.fn().mockResolvedValue('exec-1'),
          },
        } as any)
      : undefined;

    registerRunExperimentSuiteRoute({
      router,
      logger,
      experimentSuiteRegistry,
      workflowsManagement,
      canEncrypt: true,
      getEncryptedSavedObjectsStart: jest.fn(),
      getInternalRemoteConfigsSoClient: jest.fn(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('post', '/internal/evals/experiments/runs')
      .versions[API_VERSIONS.internal.v1];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    (mockCoreContext as any).http = {
      basePath: {
        get: jest.fn().mockReturnValue('/s/default'),
      },
    };
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });

    return { handler, context, workflowsManagement };
  };

  it('returns 503 when workflowsManagement is missing', async () => {
    const { handler, context } = setup({ withWorkflows: false });
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/evals/experiments/runs',
      body: {
        workflow_id: 'wf-1',
        suite_id: 'suite-1',
        task_connector_id: 'task-1',
        judge_connector_id: 'judge-1',
        suite_params: {},
      },
    });

    const res = await handler(context, request, kibanaResponseFactory);
    expect(res.status).toBe(503);
  });

  it('runs a workflow execution and returns run id + execution id', async () => {
    const { handler, context, workflowsManagement } = setup({ withWorkflows: true });
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/evals/experiments/runs',
      body: {
        workflow_id: 'wf-1',
        suite_id: 'suite-1',
        task_connector_id: 'task-1',
        judge_connector_id: 'judge-1',
        suite_params: { foo: 'bar' },
      },
    });

    const res = await handler(context, request, kibanaResponseFactory);
    expect(res.status).toBe(200);
    expect(res.payload.suite_id).toBe('suite-1');
    expect(res.payload.workflow_execution_id).toBe('exec-1');
    expect(typeof res.payload.run_id).toBe('string');

    expect(workflowsManagement!.management.getWorkflow).toHaveBeenCalledWith('wf-1', 'default');
    expect(workflowsManagement!.management.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-1' }),
      'default',
      expect.objectContaining({
        workflow_id: 'wf-1',
        suite_id: 'suite-1',
        task_connector_id: 'task-1',
        judge_connector_id: 'judge-1',
        suite_params: { foo: 'bar' },
      }),
      request,
      undefined,
      expect.objectContaining({
        run_id: res.payload.run_id,
        suite_id: 'suite-1',
        source: 'experiment',
      })
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { EVALS_EXPERIMENTS_SAVE_WORKFLOW_URL, API_VERSIONS } from '@kbn/evals-common';
import { registerSaveExperimentWorkflowRoute } from './save_experiment_workflow';
import type { RouteDependencies } from '../register_routes';

jest.mock('../../workflow_generator', () => ({
  experimentRequestToParams: jest.fn((body) => body),
  generateSavedWorkflowYaml: jest.fn(() => ({ name: 'Experiment', yaml: 'name: Experiment' })),
}));

jest.mock('../shared/authorize_target_spaces', () => ({
  findUnauthorizedTargetSpaces: jest.fn().mockResolvedValue([]),
}));

it.each([true, false])(
  'uses the request to read an existing experiment workflow (visible=%s)',
  async (visible) => {
    const router = httpServiceMock.createRouter();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_EXPERIMENTS_SAVE_WORKFLOW_URL,
      body: { workflow_id: 'private-workflow' },
    });
    const workflow: WorkflowDetailDto = {
      id: 'private-workflow',
      name: 'Experiment',
      enabled: true,
      yaml: 'name: Experiment',
      valid: true,
      createdAt: '2026-09-14',
      createdBy: 'owner',
      lastUpdatedAt: '2026-09-14',
      lastUpdatedBy: 'owner',
      definition: {
        version: '1',
        name: 'Experiment',
        enabled: true,
        tags: ['evals-experiment'],
        triggers: [{ type: 'manual' }],
        steps: [],
      },
    };
    const getWorkflow = jest.fn(async (_id: string, _space: string, caller?: KibanaRequest) =>
      visible && caller === request ? workflow : null
    );
    const updateWorkflow = jest.fn();
    registerSaveExperimentWorkflowRoute({
      router,
      logger: loggingSystemMock.createLogger(),
      workflowsManagement: {
        management: { getWorkflow, updateWorkflow },
      },
      getSpaceId: async () => 'default',
      checkManageEvalsPrivileges: jest.fn().mockResolvedValue(true),
    } as unknown as RouteDependencies);
    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('post', EVALS_EXPERIMENTS_SAVE_WORKFLOW_URL)
      .versions[API_VERSIONS.internal.v1];
    const response = await handler(
      coreMock.createCustomRequestHandlerContext({}),
      request,
      kibanaResponseFactory
    );
    expect(getWorkflow).toHaveBeenCalledWith('private-workflow', 'default', request);
    expect(response.status).toBe(visible ? 200 : 404);
    expect(updateWorkflow).toHaveBeenCalledTimes(visible ? 1 : 0);
  }
);

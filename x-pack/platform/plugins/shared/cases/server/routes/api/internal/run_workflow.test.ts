/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WorkflowsManagementApiActions,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createCasesClientMock } from '../../../client/mocks';
import type { CasesWorkflowOperations } from '../../../client/workflows/operations';
import type { CasesWorkflowRunService } from '../../../workflows/execution/service';
import type { CasesRequestHandlerContext } from '../../../types';
import { registerRoutes } from '../register_routes';
import type { CaseRoute } from '../types';
import { createRunWorkflowRoute, runCaseWorkflowParamsSchema } from './run_workflow';

/**
 * Mirrors the workflows plugin's `WorkflowTriggerInputError`, which that plugin does not export:
 * trigger preprocessing rejects a bad selection with an error carrying `statusCode: 400`.
 */
class TriggerInputError extends Error {
  public readonly statusCode = 400;
}

describe('run workflow route', () => {
  const casesClient = createCasesClientMock();
  const workflowOperations: jest.Mocked<CasesWorkflowOperations> = {
    ensureAuthorizedToRunWorkflow: jest.fn(),
    preflightWorkflowExecution: jest.fn(),
    recordWorkflowExecution: jest.fn(),
  };
  const service = {
    run: jest.fn(),
  } as unknown as jest.Mocked<CasesWorkflowRunService>;
  const getSpaceId = jest.fn().mockReturnValue('space-1');
  const getWorkflowRunContext = jest.fn().mockResolvedValue({ casesClient, workflowOperations });
  const route = createRunWorkflowRoute({ service, getSpaceId, getWorkflowRunContext });

  beforeEach(() => {
    jest.clearAllMocks();
    service.run.mockResolvedValue({
      workflowExecutionId: 'execution-1',
      activityStatus: 'succeeded',
    });
  });

  // The workflows plugin's route_privilege_consistency.test.ts only covers routes registered
  // within that plugin. This route is registered by Cases and escapes that guard, so we assert
  // the privilege explicitly here using the shared source of truth.
  it('requires the workflow execute privilege', () => {
    expect(route.security).toEqual({
      authz: {
        requiredPrivileges: [...WorkflowsManagementOperationPrivileges.execute],
      },
    });
    // Verify the concrete API action to catch any drift in WorkflowsManagementOperationPrivileges.
    const authz = route.security?.authz as { requiredPrivileges?: string[] } | undefined;
    expect(authz?.requiredPrivileges).toContain(WorkflowsManagementApiActions.execute);
  });

  it('delegates to the Cases workflow service and returns its result', async () => {
    const request = {
      params: {
        workflow_id: 'workflow-1',
      },
      body: {
        caseIds: ['case-1'],
        inputs: { event: { caseIds: ['case-1'] } },
        origin: { type: 'cases.case', caseId: 'case-1' },
      },
    };
    const response = { ok: jest.fn() };
    const context = {};

    await route.handler({
      context,
      request,
      response,
    } as unknown as Parameters<typeof route.handler>[0]);

    expect(service.run).toHaveBeenCalledWith({
      workflowId: 'workflow-1',
      body: request.body,
      request,
      context,
      casesClient,
      workflowOperations,
      spaceId: 'space-1',
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        workflowExecutionId: 'execution-1',
        activityStatus: 'succeeded',
      },
    });
  });

  it('responds with a 400 when trigger preprocessing rejects the selection', async () => {
    const router = httpServiceMock.createRouter();
    registerRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      routes: [route] as CaseRoute[],
      kibanaVersion: '9.3.0',
    });
    const [, registeredHandler] = router.post.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    service.run.mockRejectedValue(
      new TriggerInputError('No documents found with the provided IDs')
    );

    await registeredHandler(
      { cases: {} } as unknown as CasesRequestHandlerContext,
      httpServerMock.createKibanaRequest({
        method: 'post',
        params: { workflow_id: 'workflow-1' },
        body: {
          caseIds: ['case-1'],
          inputs: { event: { triggerType: 'document', documentIds: [] } },
          origin: { type: 'cases.case', caseId: 'case-1' },
        },
      }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ message: 'No documents found with the provided IDs' }),
      })
    );
  });

  describe('params schema', () => {
    it('accepts a valid workflow_id', () => {
      expect(() =>
        runCaseWorkflowParamsSchema.validate({ workflow_id: 'workflow-1' })
      ).not.toThrow();
    });

    it('rejects an oversized workflow_id', () => {
      expect(() =>
        runCaseWorkflowParamsSchema.validate({ workflow_id: 'a'.repeat(1025) })
      ).toThrow();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { createCasesClientMock } from '../../../client/mocks';
import type { CasesWorkflowRunService } from '../../../workflows/execution/service';
import { createRunWorkflowRoute } from './run_workflow';

describe('run workflow route', () => {
  const casesClient = createCasesClientMock();
  const service = {
    run: jest.fn(),
  } as unknown as jest.Mocked<CasesWorkflowRunService>;
  const getSpaceId = jest.fn().mockReturnValue('space-1');
  const route = createRunWorkflowRoute({ service, getSpaceId });

  beforeEach(() => {
    jest.clearAllMocks();
    service.run.mockResolvedValue({
      workflowExecutionId: 'execution-1',
      activityStatus: 'succeeded',
    });
  });

  it('requires the workflow execute privilege', () => {
    expect(route.security).toEqual({
      authz: {
        requiredPrivileges: [...WorkflowsManagementOperationPrivileges.execute],
      },
    });
  });

  it('delegates to the Cases workflow service and returns its result', async () => {
    const request = {
      params: {
        case_id: 'case-1',
        workflow_id: 'workflow-1',
      },
      body: {
        inputs: { event: { caseId: 'case-1' } },
        origin: { type: 'cases.case', id: 'case-1' },
      },
    };
    const response = { ok: jest.fn() };
    const context = {
      cases: {
        getCasesClient: jest.fn().mockResolvedValue(casesClient),
      },
    };

    await route.handler({
      context,
      request,
      response,
    } as unknown as Parameters<typeof route.handler>[0]);

    expect(service.run).toHaveBeenCalledWith({
      caseId: 'case-1',
      workflowId: 'workflow-1',
      body: request.body,
      request,
      context,
      casesClient,
      spaceId: 'space-1',
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        workflowExecutionId: 'execution-1',
        activityStatus: 'succeeded',
      },
    });
  });
});

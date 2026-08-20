/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { Case } from '../../../common/types/domain';
import { createCasesClientMock } from '../../client/mocks';
import type { CasesRequestHandlerContext } from '../../types';
import { CasesWorkflowRunService } from './service';

describe('CasesWorkflowRunService', () => {
  const request = httpServerMock.createKibanaRequest();
  const context = {} as CasesRequestHandlerContext;
  const logger = loggingSystemMock.createLogger();
  const audit = securityMock.createSetup().audit;
  const auditLogger = audit.asScoped(request);
  const casesClient = createCasesClientMock();
  const management = {
    isWorkflowsAvailable: true,
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
  const service = new CasesWorkflowRunService({ management, logger, audit });
  const theCase = {
    id: 'case-1',
    observables: [],
    comments: [],
  } as unknown as Case;

  beforeEach(() => {
    jest.clearAllMocks();
    casesClient.cases.get.mockResolvedValue(theCase);
    casesClient.userActions.preflightWorkflowExecution.mockResolvedValue();
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Investigate case',
      valid: true,
      enabled: true,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);
    management.executeWorkflow.mockResolvedValue({ workflowExecutionId: 'execution-1' });
  });

  it('starts the workflow with server metadata and records case activity', async () => {
    await expect(
      service.run({
        caseId: 'case-1',
        workflowId: 'workflow-1',
        body: {
          inputs: { event: { caseId: 'case-1' } },
          origin: { type: 'cases.case', id: 'case-1' },
        },
        request,
        context,
        casesClient,
        spaceId: 'default',
      })
    ).resolves.toEqual({
      workflowExecutionId: 'execution-1',
      activityStatus: 'succeeded',
    });

    expect(management.executeWorkflow).toHaveBeenCalledWith({
      workflowId: 'workflow-1',
      spaceId: 'default',
      request,
      inputs: { event: { caseId: 'case-1' } },
      waitForCompletion: false,
      metadata: {
        schemaVersion: 1,
        source: 'cases',
        caseId: 'case-1',
        origin: { type: 'cases.case', id: 'case-1' },
      },
    });
    expect(casesClient.userActions.preflightWorkflowExecution).toHaveBeenCalledWith({
      caseId: 'case-1',
    });
    expect(
      casesClient.userActions.preflightWorkflowExecution.mock.invocationCallOrder[0]
    ).toBeLessThan(management.executeWorkflow.mock.invocationCallOrder[0]);
    expect(casesClient.userActions.recordWorkflowExecution).toHaveBeenCalledWith({
      caseId: 'case-1',
      workflow: {
        id: 'workflow-1',
        name: 'Investigate case',
        executionId: 'execution-1',
      },
      origin: { type: 'cases.case', id: 'case-1' },
    });
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'case_workflow_run',
          outcome: 'success',
        }),
      })
    );
  });

  it('enriches observable activity from workflow inputs', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      observables: [{ id: 'observable-1' }],
    } as unknown as Case);

    await service.run({
      caseId: 'case-1',
      workflowId: 'workflow-1',
      body: {
        inputs: {
          event: {
            observables: [{ id: 'observable-1', typeKey: 'ip', value: '127.0.0.1' }],
          },
        },
        origin: { type: 'cases.observable', id: 'observable-1' },
      },
      request,
      context,
      casesClient,
      spaceId: 'default',
    });

    expect(casesClient.userActions.recordWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: {
          type: 'cases.observable',
          id: 'observable-1',
          typeKey: 'ip',
          value: '127.0.0.1',
        },
      })
    );
  });

  it('enriches single-alert activity from workflow inputs', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [{ type: 'alert', alertId: 'alert-1' }],
    } as unknown as Case);

    await service.run({
      caseId: 'case-1',
      workflowId: 'workflow-1',
      body: {
        inputs: {
          event: {
            alertIds: [{ _id: 'alert-1', _index: '.alerts-security.alerts-default' }],
          },
        },
        origin: { type: 'cases.alert', id: 'alert-1' },
      },
      request,
      context,
      casesClient,
      spaceId: 'default',
    });

    expect(casesClient.userActions.recordWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: {
          type: 'cases.alert',
          id: 'alert-1',
          index: '.alerts-security.alerts-default',
        },
      })
    );
  });

  it('preserves the execution id when recording activity fails', async () => {
    casesClient.userActions.recordWorkflowExecution.mockRejectedValue(new Error('activity failed'));

    await expect(
      service.run({
        caseId: 'case-1',
        workflowId: 'workflow-1',
        body: {
          inputs: {},
          origin: { type: 'cases.case', id: 'case-1' },
        },
        request,
        context,
        casesClient,
        spaceId: 'default',
      })
    ).resolves.toEqual({
      workflowExecutionId: 'execution-1',
      activityStatus: 'failed',
    });
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'case_workflow_activity_create',
          outcome: 'failure',
        }),
      })
    );
  });

  it('rejects a case origin that does not match the route case', async () => {
    await expect(
      service.run({
        caseId: 'case-1',
        workflowId: 'workflow-1',
        body: {
          inputs: {},
          origin: { type: 'cases.case', id: 'case-2' },
        },
        request,
        context,
        casesClient,
        spaceId: 'default',
      })
    ).rejects.toThrow('Workflow origin id must match case id "case-1".');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('does not start a workflow when the case activity preflight fails', async () => {
    casesClient.userActions.preflightWorkflowExecution.mockRejectedValue(
      new Error('Not authorized to update this case')
    );

    await expect(
      service.run({
        caseId: 'case-1',
        workflowId: 'workflow-1',
        body: {
          inputs: {},
          origin: { type: 'cases.case', id: 'case-1' },
        },
        request,
        context,
        casesClient,
        spaceId: 'default',
      })
    ).rejects.toThrow('Not authorized to update this case');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'case_workflow_run',
          outcome: 'failure',
        }),
      })
    );
  });
});

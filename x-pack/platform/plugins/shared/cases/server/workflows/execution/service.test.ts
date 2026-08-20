/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { RunCaseWorkflowRequest } from '../../../common/types/api';
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
  const auditLog = auditLogger.log as jest.MockedFunction<typeof auditLogger.log>;
  const casesClient = createCasesClientMock();
  const onWorkflowStarted = jest.fn();
  let workflowsAvailable = true;
  const management = {
    get isWorkflowsAvailable() {
      return workflowsAvailable;
    },
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
  const service = new CasesWorkflowRunService({
    management,
    logger,
    audit,
    onWorkflowStarted,
  });
  const theCase = {
    id: 'case-1',
    observables: [],
    comments: [],
  } as unknown as Case;
  const defaultBody: RunCaseWorkflowRequest = {
    inputs: { event: { caseId: 'case-1' } },
    origin: { type: 'cases.case', id: 'case-1' },
  };

  const run = (body: RunCaseWorkflowRequest = defaultBody) =>
    service.run({
      caseId: 'case-1',
      workflowId: 'workflow-1',
      body,
      request,
      context,
      casesClient,
      spaceId: 'default',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    workflowsAvailable = true;
    casesClient.cases.ensureAuthorizedToUpdate.mockResolvedValue();
    casesClient.cases.get.mockResolvedValue(theCase);
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Investigate case',
      valid: true,
      enabled: true,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);
    management.executeWorkflow.mockResolvedValue({ workflowExecutionId: 'execution-1' });
    onWorkflowStarted.mockResolvedValue(undefined);
  });

  it('starts the workflow with server-owned metadata', async () => {
    await expect(run()).resolves.toEqual({ workflowExecutionId: 'execution-1' });

    expect(casesClient.cases.ensureAuthorizedToUpdate).toHaveBeenCalledWith({ id: 'case-1' });
    expect(casesClient.cases.ensureAuthorizedToUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      management.executeWorkflow.mock.invocationCallOrder[0]
    );
    expect(management.executeWorkflow).toHaveBeenCalledWith({
      workflowId: 'workflow-1',
      spaceId: 'default',
      request,
      inputs: defaultBody.inputs,
      waitForCompletion: false,
      metadata: {
        schemaVersion: 1,
        source: 'cases',
        data: {
          caseId: 'case-1',
          origin: defaultBody.origin,
        },
      },
    });
    expect(onWorkflowStarted).toHaveBeenCalledWith({
      caseId: 'case-1',
      inputs: defaultBody.inputs,
      origin: defaultBody.origin,
      workflow: {
        id: 'workflow-1',
        name: 'Investigate case',
        executionId: 'execution-1',
      },
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'case_workflow_run',
          outcome: 'success',
        }),
      })
    );
  });

  it('rejects execution when workflows are unavailable', async () => {
    workflowsAvailable = false;

    await expect(run()).rejects.toThrow('Workflows are not available.');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('rejects execution when the case update is unauthorized', async () => {
    casesClient.cases.ensureAuthorizedToUpdate.mockRejectedValue(new Error('not authorized'));

    await expect(run()).rejects.toThrow('not authorized');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a case origin that does not match the route case', async () => {
    await expect(run({ inputs: {}, origin: { type: 'cases.case', id: 'case-2' } })).rejects.toThrow(
      'Workflow origin id must match case id "case-1".'
    );
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('rejects an observable that does not belong to the case', async () => {
    await expect(
      run({ inputs: {}, origin: { type: 'cases.observable', id: 'observable-1' } })
    ).rejects.toThrow('Observable "observable-1" does not belong to case "case-1".');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('accepts an observable that belongs to the case', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      observables: [{ id: 'observable-1' }],
    } as unknown as Case);

    await expect(
      run({
        inputs: { event: { observables: [{ id: 'observable-1' }] } },
        origin: { type: 'cases.observable', id: 'observable-1' },
      })
    ).resolves.toEqual({ workflowExecutionId: 'execution-1' });
  });

  it('rejects a selected alert that is not attached to the case', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [{ type: 'alert', alertId: 'alert-1' }],
    } as unknown as Case);

    await expect(
      run({
        inputs: { event: { alertIds: [{ _id: 'alert-2', _index: '.alerts' }] } },
        origin: { type: 'cases.alert', id: 'alert-2' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a single-alert origin that is not selected', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [
        { type: 'alert', alertId: 'alert-1' },
        { type: 'alert', alertId: 'alert-2' },
      ],
    } as unknown as Case);

    await expect(
      run({
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts' }] } },
        origin: { type: 'cases.alert', id: 'alert-2' },
      })
    ).rejects.toThrow('Alert workflow origin "alert-2" is not selected.');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('accepts selected alerts that are attached to the case', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [
        { type: 'alert', alertId: 'alert-1' },
        { type: 'alert', alertId: 'alert-2' },
      ],
    } as unknown as Case);

    await expect(
      run({
        inputs: {
          event: {
            alertIds: [
              { _id: 'alert-1', _index: '.alerts' },
              { _id: 'alert-2', _index: '.alerts' },
            ],
          },
        },
        origin: { type: 'cases.alerts', id: 'case-1' },
      })
    ).resolves.toEqual({ workflowExecutionId: 'execution-1' });
  });

  it('rejects a missing workflow', async () => {
    management.getWorkflow.mockResolvedValue(null);

    await expect(run()).rejects.toThrow('Workflow "workflow-1" was not found.');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('rejects an invalid workflow', async () => {
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Invalid workflow',
      valid: false,
      enabled: true,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);

    await expect(run()).rejects.toThrow('Workflow is not valid.');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a disabled workflow', async () => {
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Disabled workflow',
      valid: true,
      enabled: false,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);

    await expect(run()).rejects.toThrow('Workflow is disabled. Enable it to run it.');
    expect(management.executeWorkflow).not.toHaveBeenCalled();
  });

  it('preserves the execution result when the post-execution callback fails', async () => {
    onWorkflowStarted.mockRejectedValue(new Error('callback failed'));

    await expect(run()).resolves.toEqual({ workflowExecutionId: 'execution-1' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('post-execution callback failed')
    );
  });

  it('audits execution failures', async () => {
    management.executeWorkflow.mockRejectedValue(new Error('execution failed'));

    await expect(run()).rejects.toThrow('execution failed');
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { message: 'execution failed' },
        event: expect.objectContaining({
          action: 'case_workflow_run',
          outcome: 'failure',
        }),
      })
    );
  });

  it('does not let audit logging failures block execution', async () => {
    auditLog.mockImplementation(() => {
      throw new Error('audit failed');
    });

    await expect(run()).resolves.toEqual({ workflowExecutionId: 'execution-1' });
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write Cases workflow audit event')
    );
  });
});

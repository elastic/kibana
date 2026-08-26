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
  let workflowsAvailable = true;
  let licenseValid = true;
  const management = {
    get isWorkflowsAvailable() {
      return workflowsAvailable;
    },
    getWorkflow: jest.fn(),
    runWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
  const service = new CasesWorkflowRunService({
    management,
    logger,
    audit,
    isLicenseValid: () => licenseValid,
  });
  const theCase = {
    id: 'case-1',
    observables: [],
    comments: [],
  } as unknown as Case;
  const defaultBody: RunCaseWorkflowRequest = {
    caseIds: ['case-1'],
    inputs: { event: { caseIds: ['case-1'] } },
    origin: { type: 'cases.case', id: 'case-1' },
  };

  const run = (body: RunCaseWorkflowRequest = defaultBody) =>
    service.run({
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
    licenseValid = true;
    casesClient.cases.ensureAuthorizedToUpdate.mockResolvedValue();
    casesClient.cases.get.mockResolvedValue(theCase);
    casesClient.userActions.preflightWorkflowExecution.mockResolvedValue(undefined);
    casesClient.userActions.recordWorkflowExecution.mockResolvedValue(undefined);
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Investigate case',
      valid: true,
      enabled: true,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);
    management.runWorkflow.mockResolvedValue('execution-1');
  });

  it('starts the workflow with server-owned metadata', async () => {
    await expect(run()).resolves.toEqual({
      workflowExecutionId: 'execution-1',
      activityStatus: 'succeeded',
    });

    expect(casesClient.cases.ensureAuthorizedToUpdate).toHaveBeenCalledWith({ ids: ['case-1'] });
    expect(casesClient.cases.ensureAuthorizedToUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      management.runWorkflow.mock.invocationCallOrder[0]
    );
    // Passes the converted model, space, processed inputs, and server-owned metadata.
    // Does NOT pass waitForCompletion — runWorkflow schedules immediately without polling.
    expect(management.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workflow-1', name: 'Investigate case' }),
      'default',
      // The server injects event.caseIds — the authorized set, not whatever the client sent.
      { event: { caseIds: ['case-1'] } },
      request,
      undefined,
      {
        schemaVersion: 1,
        source: 'cases',
        caseIds: ['case-1'],
        origin: defaultBody.origin,
      }
    );
    // preflightWorkflowExecution runs before the workflow to enforce the user-action limit.
    expect(casesClient.userActions.preflightWorkflowExecution).toHaveBeenCalledWith({
      caseIds: ['case-1'],
    });
    // recordWorkflowExecution persists the activity log entry after a successful run.
    expect(casesClient.userActions.recordWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        caseIds: ['case-1'],
        workflow: expect.objectContaining({
          id: 'workflow-1',
          name: 'Investigate case',
          executionId: 'execution-1',
        }),
        origin: defaultBody.origin,
      })
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'case_workflow_run',
          outcome: 'success',
        }),
        kibana: expect.objectContaining({
          saved_object: expect.objectContaining({ id: 'case-1' }),
        }),
      })
    );
  });

  describe('multi-case runs', () => {
    const multiCaseBody: RunCaseWorkflowRequest = {
      caseIds: ['case-a', 'case-b', 'case-c'],
      inputs: { event: { caseIds: ['case-a', 'case-b', 'case-c'] } },
      origin: { type: 'cases.case', id: 'case-a' },
    };

    it('fires exactly one workflow execution for N cases with server-owned event.caseIds', async () => {
      await expect(run(multiCaseBody)).resolves.toEqual({
        workflowExecutionId: 'execution-1',
        activityStatus: 'succeeded',
      });
      expect(management.runWorkflow).toHaveBeenCalledTimes(1);
      expect(management.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        // Server overwrites event.caseIds to the authorized set.
        { event: { caseIds: ['case-a', 'case-b', 'case-c'] } },
        request,
        undefined,
        expect.objectContaining({ caseIds: ['case-a', 'case-b', 'case-c'] })
      );
    });

    it('does NOT call casesClient.cases.get for multi-case runs (avoids N×fetch)', async () => {
      await run(multiCaseBody);
      expect(casesClient.cases.get).not.toHaveBeenCalled();
    });

    it('passes all caseIds to preflightWorkflowExecution', async () => {
      await run(multiCaseBody);
      expect(casesClient.userActions.preflightWorkflowExecution).toHaveBeenCalledWith({
        caseIds: ['case-a', 'case-b', 'case-c'],
      });
    });

    it('passes all caseIds to recordWorkflowExecution', async () => {
      await run(multiCaseBody);
      expect(casesClient.userActions.recordWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({ caseIds: ['case-a', 'case-b', 'case-c'] })
      );
    });

    it('emits one audit event per case on success', async () => {
      await run(multiCaseBody);
      expect(auditLog).toHaveBeenCalledTimes(3);
      for (const id of ['case-a', 'case-b', 'case-c']) {
        expect(auditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({ action: 'case_workflow_run', outcome: 'success' }),
            kibana: expect.objectContaining({ saved_object: expect.objectContaining({ id }) }),
          })
        );
      }
    });

    it('emits one audit event per case on failure', async () => {
      management.runWorkflow.mockRejectedValue(new Error('execution failed'));
      await expect(run(multiCaseBody)).rejects.toThrow('execution failed');
      expect(auditLog).toHaveBeenCalledTimes(3);
      for (const id of ['case-a', 'case-b', 'case-c']) {
        expect(auditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({ action: 'case_workflow_run', outcome: 'failure' }),
            kibana: expect.objectContaining({ saved_object: expect.objectContaining({ id }) }),
          })
        );
      }
    });

    // SECURITY REGRESSION TEST: a user authorized on case-a but not case-b must NOT be able
    // to start a workflow that acts on case-b.
    it('refuses to start the workflow when the caller is not authorized on all cases', async () => {
      casesClient.cases.ensureAuthorizedToUpdate.mockRejectedValue(
        new Error('Unauthorized: case-b')
      );

      await expect(run(multiCaseBody)).rejects.toThrow('Unauthorized: case-b');
      expect(management.runWorkflow).not.toHaveBeenCalled();
    });

    it('rejects a multi-case run with a non-case origin type', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {},
          origin: { type: 'cases.observable', id: 'obs-1' },
        })
      ).rejects.toThrow('can only be used with a single case');
      expect(management.runWorkflow).not.toHaveBeenCalled();
    });

    it('rejects a multi-case run where origin.id is not in caseIds', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {},
          origin: { type: 'cases.case', id: 'not-in-list' },
        })
      ).rejects.toThrow('Workflow origin id must be one of the requested case ids.');
      expect(management.runWorkflow).not.toHaveBeenCalled();
    });

    it('rejects a multi-case run with alert inputs', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: { event: { alertIds: [{ _id: 'a-1', _index: '.alerts' }] } },
          origin: { type: 'cases.case', id: 'case-a' },
        })
      ).rejects.toThrow('Alert inputs can only be used with a single case.');
      expect(management.runWorkflow).not.toHaveBeenCalled();
    });
  });

  it('overwrites client-supplied event.caseIds with the authorized set', async () => {
    // A client that sends a superset in inputs cannot widen the blast radius
    // beyond the ids it declared in body.caseIds (and was authorized for).
    await run({
      caseIds: ['case-1'],
      inputs: { event: { caseIds: ['case-1', 'case-evil'], triggerType: 'manual' } },
      origin: { type: 'cases.case', id: 'case-1' },
    });

    expect(management.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      'default',
      // event.caseIds is forced to the authorized set; other event fields are preserved.
      { event: { caseIds: ['case-1'], triggerType: 'manual' } },
      request,
      undefined,
      expect.anything()
    );
  });

  it('rejects execution when workflows are unavailable', async () => {
    workflowsAvailable = false;

    await expect(run()).rejects.toThrow('Workflows are not available.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects execution when the license is insufficient', async () => {
    licenseValid = false;

    await expect(run()).rejects.toThrow('Workflows require an active Enterprise license.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects execution when preflight fails (user-action limit reached)', async () => {
    casesClient.userActions.preflightWorkflowExecution.mockRejectedValue(
      new Error('User action limit reached')
    );

    await expect(run()).rejects.toThrow('User action limit reached');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects execution when the case update is unauthorized', async () => {
    casesClient.cases.ensureAuthorizedToUpdate.mockRejectedValue(new Error('not authorized'));

    await expect(run()).rejects.toThrow('not authorized');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a case origin that does not match the route case', async () => {
    await expect(
      run({ caseIds: ['case-1'], inputs: {}, origin: { type: 'cases.case', id: 'case-2' } })
    ).rejects.toThrow('Workflow origin id must match case id "case-1".');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects an observable that does not belong to the case', async () => {
    await expect(
      run({
        caseIds: ['case-1'],
        inputs: {},
        origin: { type: 'cases.observable', id: 'observable-1' },
      })
    ).rejects.toThrow('Observable "observable-1" does not belong to case "case-1".');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('accepts an observable that belongs to the case', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      observables: [{ id: 'observable-1' }],
    } as unknown as Case);

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { observables: [{ id: 'observable-1' }] } },
        origin: { type: 'cases.observable', id: 'observable-1' },
      })
    ).resolves.toEqual({ workflowExecutionId: 'execution-1', activityStatus: 'succeeded' });
  });

  it('rejects alert inputs for a case origin when alerts are not attached', async () => {
    // A cases.case origin must not bypass alert-membership validation — an attacker
    // could otherwise inject arbitrary alerts by switching to a non-alert origin type.
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [{ type: 'alert', alertId: 'alert-1', index: '.alerts' }],
    } as unknown as Case);

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-99', _index: '.alerts' }] } },
        origin: { type: 'cases.case', id: 'case-1' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects alert inputs for an observable origin when alerts are not attached', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      observables: [{ id: 'observable-1' }],
      comments: [{ type: 'alert', alertId: 'alert-1', index: '.alerts' }],
    } as unknown as Case);

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-99', _index: '.alerts' }] } },
        origin: { type: 'cases.observable', id: 'observable-1' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a selected alert that is not attached to the case', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [{ type: 'alert', alertId: 'alert-1', index: '.alerts' }],
    } as unknown as Case);

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-2', _index: '.alerts' }] } },
        origin: { type: 'cases.alert', id: 'alert-2' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a selected alert with a matching id but wrong index', async () => {
    // Alert membership is validated as (id, index) pairs so that an alert id from
    // one index cannot be used to access data from a different index.
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [{ type: 'alert', alertId: 'alert-1', index: '.alerts-real' }],
    } as unknown as Case);

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts-spoofed' }] } },
        origin: { type: 'cases.alert', id: 'alert-1' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a single-alert origin that is not selected', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [
        { type: 'alert', alertId: 'alert-1', index: '.alerts' },
        { type: 'alert', alertId: 'alert-2', index: '.alerts' },
      ],
    } as unknown as Case);

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts' }] } },
        origin: { type: 'cases.alert', id: 'alert-2' },
      })
    ).rejects.toThrow('Alert workflow origin "alert-2" is not selected.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('accepts selected alerts that are attached to the case', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      comments: [
        { type: 'alert', alertId: 'alert-1', index: '.alerts' },
        { type: 'alert', alertId: 'alert-2', index: '.alerts' },
      ],
    } as unknown as Case);

    await expect(
      run({
        caseIds: ['case-1'],
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
    ).resolves.toEqual({ workflowExecutionId: 'execution-1', activityStatus: 'succeeded' });
  });

  it('rejects a missing workflow', async () => {
    management.getWorkflow.mockResolvedValue(null);

    await expect(run()).rejects.toThrow('Workflow "workflow-1" was not found.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects an invalid workflow', async () => {
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Invalid workflow',
      valid: false,
      enabled: true,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);

    await expect(run()).rejects.toThrow('Workflow is not valid.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a disabled workflow', async () => {
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Disabled workflow',
      valid: true,
      enabled: false,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);

    await expect(run()).rejects.toThrow('Workflow is disabled. Enable it to run it.');
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('returns activityStatus: failed when recordWorkflowExecution throws, without rethrowing', async () => {
    casesClient.userActions.recordWorkflowExecution.mockRejectedValue(
      new Error('activity recording failed')
    );

    await expect(run()).resolves.toEqual({
      workflowExecutionId: 'execution-1',
      activityStatus: 'failed',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('audits execution failures', async () => {
    management.runWorkflow.mockRejectedValue(new Error('execution failed'));

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

    await expect(run()).resolves.toEqual({
      workflowExecutionId: 'execution-1',
      activityStatus: 'succeeded',
    });
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write Cases workflow audit event')
    );
  });
});

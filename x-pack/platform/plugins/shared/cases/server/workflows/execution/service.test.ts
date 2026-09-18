/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { DocumentResponse, RunCaseWorkflowRequest } from '../../../common/types/api';
import type { Case } from '../../../common/types/domain';
import { createCasesClientMock } from '../../client/mocks';
import type { CasesRequestHandlerContext } from '../../types';
import { CasesWorkflowRunService } from './service';

describe('CasesWorkflowRunService', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();
  const audit = securityMock.createSetup().audit;
  const auditLogger = audit.asScoped(request);
  const auditLog = auditLogger.log as jest.MockedFunction<typeof auditLogger.log>;
  const casesClient = createCasesClientMock();

  let workflowsAvailable = true;
  let licenseValid = true;
  const license = {
    isAvailable: true,
    isActive: true,
    hasAtLeast: jest.fn(() => licenseValid),
  };
  const context = {
    licensing: Promise.resolve({ license }),
  } as unknown as CasesRequestHandlerContext;
  const management = {
    get isWorkflowsAvailable() {
      return workflowsAvailable;
    },
    getWorkflow: jest.fn(),
    runWorkflowWithPreprocessing: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
  const ensureAuthorizedToRunWorkflow = jest.fn();
  const getWorkflowRunAuthorizer = jest.fn(async () => ({ ensureAuthorizedToRunWorkflow }));
  const service = new CasesWorkflowRunService({
    management,
    logger,
    audit,
    getWorkflowRunAuthorizer,
  });
  const theCase = {
    id: 'case-1',
    observables: [],
  } as unknown as Case;
  const createAttachedAlerts = (
    ...attachments: Array<{ type: 'alert'; alertId: string; index: string }>
  ): DocumentResponse =>
    attachments.map(({ alertId, index }) => ({
      id: alertId,
      index,
      attached_at: '2026-08-26T00:00:00.000Z',
    }));
  const defaultBody: RunCaseWorkflowRequest = {
    caseIds: ['case-1'],
    inputs: { event: { caseIds: ['case-1'] } },
    origin: { type: 'cases.case', caseId: 'case-1' },
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
    ensureAuthorizedToRunWorkflow.mockResolvedValue(undefined);
    casesClient.cases.get.mockResolvedValue(theCase);
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue([]);
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Investigate case',
      valid: true,
      enabled: true,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);
    management.runWorkflowWithPreprocessing.mockResolvedValue({
      workflowExecutionId: 'execution-1',
    });
  });

  it('starts the workflow with server-owned metadata', async () => {
    await expect(run()).resolves.toEqual({ workflowExecutionId: 'execution-1' });

    expect(ensureAuthorizedToRunWorkflow).toHaveBeenCalledWith({
      ids: ['case-1'],
    });
    expect(casesClient.cases.get).toHaveBeenCalledWith({ id: 'case-1' });
    expect(casesClient.attachments.getAllDocumentsAttachedToCase).not.toHaveBeenCalled();
    expect(ensureAuthorizedToRunWorkflow.mock.invocationCallOrder[0]).toBeLessThan(
      management.runWorkflowWithPreprocessing.mock.invocationCallOrder[0]
    );
    expect(management.runWorkflowWithPreprocessing).toHaveBeenCalledWith({
      workflow: expect.objectContaining({ id: 'workflow-1', name: 'Investigate case' }),
      spaceId: 'default',
      // Client-supplied event.caseIds is stripped from inputs; the server re-injects the
      // authorized set via eventOverrides (applied after trigger-input preprocessing so it
      // survives preprocessTriggerInputs's event replacement).
      inputs: { event: {} },
      request,
      preprocessingContext: context,
      eventOverrides: { caseIds: ['case-1'] },
      metadata: {
        schemaVersion: 1,
        source: 'cases',
        caseIds: ['case-1'],
        origin: defaultBody.origin,
      },
    });
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

  it('passes trigger-input preprocessing context with event intact', async () => {
    const body: RunCaseWorkflowRequest = {
      caseIds: ['case-1'],
      inputs: {
        event: {
          triggerType: 'alert',
          alertIds: [{ _id: 'alert-1', _index: '.alerts' }],
        },
      },
      origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-1' },
    };
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
      createAttachedAlerts({ type: 'alert', alertId: 'alert-1', index: '.alerts' })
    );
    management.runWorkflowWithPreprocessing.mockResolvedValue({
      workflowExecutionId: 'execution-1',
    });

    await expect(run(body)).resolves.toEqual({ workflowExecutionId: 'execution-1' });

    expect(casesClient.attachments.getAllDocumentsAttachedToCase).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachmentTypes: ['alert'],
    });
    expect(management.runWorkflowWithPreprocessing).toHaveBeenCalledWith(
      expect.objectContaining({
        // caseIds is passed via eventOverrides, not pre-merged into inputs.event, so that it
        // survives trigger-input preprocessing, which replaces the entire event object.
        inputs: {
          event: {
            triggerType: 'alert',
            alertIds: [{ _id: 'alert-1', _index: '.alerts' }],
          },
        },
        eventOverrides: { caseIds: ['case-1'] },
        preprocessingContext: context,
      })
    );
  });

  describe('trigger selection membership', () => {
    it.each(['alert', 'document'] as const)(
      'rejects a query-based %s selection before preprocessing',
      async (triggerType) => {
        const body: RunCaseWorkflowRequest = {
          caseIds: ['case-1'],
          inputs: {
            event: {
              triggerType,
              querySelection: { index: '*', query: { match_all: {} } },
            },
          },
          origin: { type: 'cases.case', caseId: 'case-1' },
        };

        await expect(run(body)).rejects.toThrow(
          'Query-based trigger selections are not supported for case workflows.'
        );
        expect(casesClient.cases.get).not.toHaveBeenCalled();
        expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
      }
    );

    it('runs an explicit alert selection when every alert is attached', async () => {
      const body: RunCaseWorkflowRequest = {
        caseIds: ['case-1'],
        inputs: {
          event: {
            triggerType: 'alert',
            alertIds: [{ _id: 'alert-1', _index: '.alerts' }],
          },
        },
        origin: { type: 'cases.alerts', caseId: 'case-1' },
      };
      casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
        createAttachedAlerts({ type: 'alert', alertId: 'alert-1', index: '.alerts' })
      );

      await expect(run(body)).resolves.toEqual({ workflowExecutionId: 'execution-1' });
      expect(casesClient.attachments.getAllDocumentsAttachedToCase).toHaveBeenCalledWith({
        caseId: 'case-1',
        attachmentTypes: ['alert'],
      });
    });

    it('runs an explicit document selection when every document is attached', async () => {
      const body: RunCaseWorkflowRequest = {
        caseIds: ['case-1'],
        inputs: {
          event: {
            triggerType: 'document',
            documentIds: [{ _id: 'event-1', _index: 'logs-default' }],
          },
        },
        origin: { type: 'cases.case', caseId: 'case-1' },
      };
      casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue([
        {
          id: 'event-1',
          index: 'logs-default',
          attached_at: '2026-09-16T00:00:00.000Z',
        },
      ]);

      await expect(run(body)).resolves.toEqual({ workflowExecutionId: 'execution-1' });
      expect(casesClient.attachments.getAllDocumentsAttachedToCase).toHaveBeenCalledWith({
        caseId: 'case-1',
        attachmentTypes: ['event'],
      });
    });

    it('refetches pre-expanded alerts using their validated identities', async () => {
      const body: RunCaseWorkflowRequest = {
        caseIds: ['case-1'],
        inputs: {
          event: {
            alerts: [
              {
                _id: 'alert-1',
                _index: '.alerts',
                'kibana.alert.rule.name': 'Forged rule name',
              },
            ],
          },
        },
        origin: { type: 'cases.alerts', caseId: 'case-1' },
      };
      casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
        createAttachedAlerts({ type: 'alert', alertId: 'alert-1', index: '.alerts' })
      );

      await expect(run(body)).resolves.toEqual({ workflowExecutionId: 'execution-1' });
      expect(management.runWorkflowWithPreprocessing).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: {
            event: {
              triggerType: 'alert',
              alertIds: [{ _id: 'alert-1', _index: '.alerts' }],
            },
          },
        })
      );
    });

    it('refetches pre-expanded documents using their validated identities', async () => {
      const body: RunCaseWorkflowRequest = {
        caseIds: ['case-1'],
        inputs: {
          event: {
            documents: [
              {
                id: 'event-1',
                index: 'logs-default',
                timestamp: '2026-09-16T00:00:00.000Z',
                data: { message: 'forged document content' },
              },
            ],
            query: 'host.name: server-1',
            dataView: 'logs-*',
          },
        },
        origin: { type: 'cases.case', caseId: 'case-1' },
      };
      casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue([
        {
          id: 'event-1',
          index: 'logs-default',
          attached_at: '2026-09-16T00:00:00.000Z',
        },
      ]);

      await expect(run(body)).resolves.toEqual({ workflowExecutionId: 'execution-1' });
      expect(management.runWorkflowWithPreprocessing).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: {
            event: {
              triggerType: 'document',
              documentIds: [{ _id: 'event-1', _index: 'logs-default' }],
              query: 'host.name: server-1',
              dataView: 'logs-*',
            },
          },
        })
      );
    });

    it('rejects an explicit document selection when a document is not attached', async () => {
      const body: RunCaseWorkflowRequest = {
        caseIds: ['case-1'],
        inputs: {
          event: {
            triggerType: 'document',
            documentIds: [{ _id: 'outside-event', _index: 'logs-default' }],
          },
        },
        origin: { type: 'cases.case', caseId: 'case-1' },
      };
      casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue([]);

      await expect(run(body)).rejects.toThrow('All selected documents must belong to the case.');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });
  });

  describe('bulk runs (no origin)', () => {
    const bulkBody: RunCaseWorkflowRequest = {
      caseIds: ['case-a', 'case-b', 'case-c'],
      inputs: { event: { caseIds: ['case-a', 'case-b', 'case-c'] } },
    };

    it('fires exactly one workflow execution for N cases with server-owned event.caseIds', async () => {
      await expect(run(bulkBody)).resolves.toEqual({ workflowExecutionId: 'execution-1' });
      expect(management.runWorkflowWithPreprocessing).toHaveBeenCalledTimes(1);
      expect(management.runWorkflowWithPreprocessing).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'default',
          // Client-supplied event.caseIds is stripped; authorized set goes via eventOverrides.
          inputs: { event: {} },
          eventOverrides: { caseIds: ['case-a', 'case-b', 'case-c'] },
          request,
          metadata: expect.objectContaining({ caseIds: ['case-a', 'case-b', 'case-c'] }),
        })
      );
    });

    it('does NOT call casesClient.cases.get for bulk runs (avoids N×fetch)', async () => {
      await run(bulkBody);
      expect(casesClient.cases.get).not.toHaveBeenCalled();
    });

    it('is also legal when exactly one case is selected (list-surface single-select)', async () => {
      await expect(run({ caseIds: ['case-1'], inputs: {} })).resolves.toEqual({
        workflowExecutionId: 'execution-1',
      });
      // No case fetch when origin is absent.
      expect(casesClient.cases.get).not.toHaveBeenCalled();
    });

    it('emits one audit event per case on success', async () => {
      await run(bulkBody);
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
      management.runWorkflowWithPreprocessing.mockRejectedValue(new Error('execution failed'));
      await expect(run(bulkBody)).rejects.toThrow('execution failed');
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
      ensureAuthorizedToRunWorkflow.mockRejectedValue(new Error('Unauthorized: case-b'));

      await expect(run(bulkBody)).rejects.toThrow('Unauthorized: case-b');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });

    it('rejects alert inputs when origin is absent', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: { event: { alertIds: [{ _id: 'a-1', _index: '.alerts' }] } },
        })
      ).rejects.toThrow('Trigger selections can only be used with a single case.');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });

    it('rejects query-based alert inputs regardless of origin', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {
            event: {
              triggerType: 'alert',
              querySelection: { index: '.alerts-*', query: { match_all: {} } },
            },
          },
        })
      ).rejects.toThrow('Query-based trigger selections are not supported for case workflows.');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });

    it('rejects document inputs when origin is absent', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {
            event: {
              triggerType: 'document',
              documentIds: [{ _id: 'doc-1', _index: 'logs-default' }],
            },
          },
        })
      ).rejects.toThrow('Trigger selections can only be used with a single case.');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });

    it('rejects pre-expanded selections without a trigger type when origin is absent', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {
            event: {
              documents: [{ id: 'doc-1', index: 'logs-default', data: {} }],
            },
          },
        })
      ).rejects.toThrow('Trigger selections can only be used with a single case.');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });
  });

  describe('single-case (sub-entity) origin types reject multiple caseIds', () => {
    it('rejects cases.case with multiple caseIds', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {},
          origin: { type: 'cases.case', caseId: 'case-a' },
        })
      ).rejects.toThrow('can only be used with a single case');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });

    it('rejects cases.observable with multiple caseIds', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {},
          origin: { type: 'cases.observable', caseId: 'case-a', observableId: 'obs-1' },
        })
      ).rejects.toThrow('can only be used with a single case');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });

    it('rejects cases.alert with multiple caseIds', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {},
          origin: { type: 'cases.alert', caseId: 'case-a', alertId: 'alert-1' },
        })
      ).rejects.toThrow('can only be used with a single case');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });

    it('rejects cases.alerts with multiple caseIds', async () => {
      await expect(
        run({
          caseIds: ['case-a', 'case-b'],
          inputs: {},
          origin: { type: 'cases.alerts', caseId: 'case-a' },
        })
      ).rejects.toThrow('can only be used with a single case');
      expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
    });
  });

  it('strips client-supplied event.caseIds and re-injects the authorized set via eventOverrides', async () => {
    // A client that sends a superset in inputs cannot widen the blast radius
    // beyond the ids it declared in body.caseIds (and was authorized for).
    // Client caseIds are dropped from inputs; the authorized set is re-applied after
    // trigger-input preprocessing via eventOverrides so it survives event object replacement.
    await run({
      caseIds: ['case-1'],
      inputs: { event: { caseIds: ['case-1', 'case-evil'], triggerType: 'manual' } },
      origin: { type: 'cases.case', caseId: 'case-1' },
    });

    expect(management.runWorkflowWithPreprocessing).toHaveBeenCalledWith(
      expect.objectContaining({
        // Client-supplied caseIds stripped; triggerType preserved; authorized set in eventOverrides.
        inputs: { event: { triggerType: 'manual' } },
        eventOverrides: { caseIds: ['case-1'] },
        request,
      })
    );
  });

  it('rejects execution when workflows are unavailable', async () => {
    workflowsAvailable = false;

    await expect(run()).rejects.toThrow('Workflows are not available.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects execution when the license is insufficient', async () => {
    licenseValid = false;

    await expect(run()).rejects.toThrow('Workflows require an active Enterprise license.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects execution when the case update is unauthorized', async () => {
    ensureAuthorizedToRunWorkflow.mockRejectedValue(new Error('not authorized'));

    await expect(run()).rejects.toThrow('not authorized');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects a case origin whose caseId does not match the target case', async () => {
    await expect(
      run({ caseIds: ['case-1'], inputs: {}, origin: { type: 'cases.case', caseId: 'case-2' } })
    ).rejects.toThrow('Workflow origin caseId must match case id "case-1".');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects an observable that does not belong to the case', async () => {
    await expect(
      run({
        caseIds: ['case-1'],
        inputs: {},
        origin: { type: 'cases.observable', caseId: 'case-1', observableId: 'observable-1' },
      })
    ).rejects.toThrow('Observable "observable-1" does not belong to case "case-1".');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
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
        origin: { type: 'cases.observable', caseId: 'case-1', observableId: 'observable-1' },
      })
    ).resolves.toEqual({ workflowExecutionId: 'execution-1' });
  });

  it('rejects alert inputs for a case origin when alerts are not attached', async () => {
    // A cases.case origin must not bypass alert-membership validation — an attacker
    // could otherwise inject arbitrary alerts by switching to a non-alert origin type.
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
      createAttachedAlerts({ type: 'alert', alertId: 'alert-1', index: '.alerts' })
    );

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-99', _index: '.alerts' }] } },
        origin: { type: 'cases.case', caseId: 'case-1' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects alert inputs for an observable origin when alerts are not attached', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      observables: [{ id: 'observable-1' }],
    } as unknown as Case);
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
      createAttachedAlerts({ type: 'alert', alertId: 'alert-1', index: '.alerts' })
    );

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-99', _index: '.alerts' }] } },
        origin: { type: 'cases.observable', caseId: 'case-1', observableId: 'observable-1' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects a selected alert that is not attached to the case', async () => {
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
      createAttachedAlerts({ type: 'alert', alertId: 'alert-1', index: '.alerts' })
    );

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-2', _index: '.alerts' }] } },
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-2' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects a selected alert with a matching id but wrong index', async () => {
    // Alert membership is validated as (id, index) pairs so that an alert id from
    // one index cannot be used to access data from a different index.
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
      createAttachedAlerts({ type: 'alert', alertId: 'alert-1', index: '.alerts-real' })
    );

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts-spoofed' }] } },
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-1' },
      })
    ).rejects.toThrow('All selected alerts must belong to the case.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects an alert origin without selected alerts with a specific validation error', async () => {
    await expect(
      run({
        caseIds: ['case-1'],
        inputs: {},
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-1' },
      })
    ).rejects.toThrow('Alert workflow origins require at least one selected alert.');
    expect(casesClient.attachments.getAllDocumentsAttachedToCase).not.toHaveBeenCalled();
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects a single-alert origin whose alertId is not among the selected alerts', async () => {
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
      createAttachedAlerts(
        { type: 'alert', alertId: 'alert-1', index: '.alerts' },
        { type: 'alert', alertId: 'alert-2', index: '.alerts' }
      )
    );

    await expect(
      run({
        caseIds: ['case-1'],
        inputs: { event: { alertIds: [{ _id: 'alert-1', _index: '.alerts' }] } },
        origin: { type: 'cases.alert', caseId: 'case-1', alertId: 'alert-2' },
      })
    ).rejects.toThrow('Alert workflow origin "alert-2" is not selected.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('accepts selected alerts that are attached to the case', async () => {
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(
      createAttachedAlerts(
        { type: 'alert', alertId: 'alert-1', index: '.alerts' },
        { type: 'alert', alertId: 'alert-2', index: '.alerts' }
      )
    );

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
        origin: { type: 'cases.alerts', caseId: 'case-1' },
      })
    ).resolves.toEqual({ workflowExecutionId: 'execution-1' });
  });

  it('rejects a missing workflow', async () => {
    management.getWorkflow.mockResolvedValue(null);

    await expect(run()).rejects.toThrow('Workflow "workflow-1" was not found.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects an invalid workflow', async () => {
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Invalid workflow',
      valid: false,
      enabled: true,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);

    await expect(run()).rejects.toThrow('Workflow is not valid.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('rejects a disabled workflow', async () => {
    management.getWorkflow.mockResolvedValue({
      id: 'workflow-1',
      name: 'Disabled workflow',
      valid: true,
      enabled: false,
    } as Awaited<ReturnType<typeof management.getWorkflow>>);

    await expect(run()).rejects.toThrow('Workflow is disabled. Enable it to run it.');
    expect(management.runWorkflowWithPreprocessing).not.toHaveBeenCalled();
  });

  it('audits execution failures', async () => {
    management.runWorkflowWithPreprocessing.mockRejectedValue(new Error('execution failed'));

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

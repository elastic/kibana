/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import {
  getEventChainContext,
  setWorkflowEventChainContext,
} from '@kbn/workflows-extensions/server';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import {
  createAlertWorkflowExecutionContext,
  createAlertsWorkflowExecutionContext,
  createAttachmentWorkflowExecutionContext,
  createCaseWorkflowExecutionContext,
  createCommentWorkflowExecutionContext,
  createObservableWorkflowExecutionContext,
} from '../../../common/workflows/execution_context';
import { createCasesClientMock } from '../../client/mocks';
import {
  createCasesWorkflowExecutionContextDefinition,
  createCasesWorkflowExecutionContextDefinitions,
} from './definition';
import { registerCasesWorkflowExecutionContext } from './register';

describe('Cases workflow execution context definition', () => {
  const workflow = { id: 'workflow-1', name: 'Investigate case' };

  it('uses the request-scoped client to record workflow activity', async () => {
    const request = httpServerMock.createKibanaRequest();
    const eventChainContext = {
      depth: 2,
      sourceExecutionId: 'execution-1',
      visitedWorkflowIds: ['workflow-1'],
    };
    setWorkflowEventChainContext(request, eventChainContext);
    const casesClient = createCasesClientMock();
    const getCasesClient = jest.fn().mockResolvedValue(casesClient);
    const definition = createCasesWorkflowExecutionContextDefinition('cases.case', getCasesClient);

    await definition.onExecutionStarted?.({
      request,
      executionContext: createCaseWorkflowExecutionContext('case-1'),
      workflow,
      workflowExecutionId: 'execution-1',
      inputs: { event: { owner: 'untrusted-owner' } },
    });

    expect(getCasesClient).toHaveBeenCalledWith(request);
    expect(getEventChainContext(getCasesClient.mock.calls[0][0])).toEqual(eventChainContext);
    expect(casesClient.userActions.recordWorkflowExecution).toHaveBeenCalledWith({
      caseId: 'case-1',
      workflow: {
        id: 'workflow-1',
        name: 'Investigate case',
        executionId: 'execution-1',
      },
      origin: {
        type: 'cases.case',
        id: 'case-1',
      },
    });
  });

  it.each([
    [createObservableWorkflowExecutionContext('observable-1', 'case-1'), 'cases.observable'],
    [createAlertWorkflowExecutionContext('alert-1', 'case-1'), 'cases.alert'],
    [createAlertsWorkflowExecutionContext('case-1'), 'cases.alerts'],
    [createCommentWorkflowExecutionContext('comment-1', 'case-1'), 'cases.comment'],
    [createAttachmentWorkflowExecutionContext('attachment-1', 'case-1'), 'cases.attachment'],
  ] as const)('records %s activity against the parent case', async (executionContext, type) => {
    const casesClient = createCasesClientMock();
    const definitions = createCasesWorkflowExecutionContextDefinitions(
      jest.fn().mockResolvedValue(casesClient)
    );
    const definition = definitions.find((item) => item.type === type);
    if (!definition) {
      throw new Error(`Missing execution context definition for ${type}`);
    }

    await definition.onExecutionStarted?.({
      request: httpServerMock.createKibanaRequest(),
      executionContext,
      workflow,
      workflowExecutionId: 'execution-1',
      inputs: {},
    });

    expect(casesClient.userActions.recordWorkflowExecution).toHaveBeenCalledWith({
      caseId: 'case-1',
      workflow: {
        ...workflow,
        executionId: 'execution-1',
      },
      origin: {
        type,
        id: executionContext.id,
      },
    });
  });

  it('records the alert index from the processed workflow event', async () => {
    const casesClient = createCasesClientMock();
    const definition = createCasesWorkflowExecutionContextDefinition(
      'cases.alert',
      jest.fn().mockResolvedValue(casesClient)
    );

    await definition.onExecutionStarted?.({
      request: httpServerMock.createKibanaRequest(),
      executionContext: createAlertWorkflowExecutionContext('alert-1', 'case-1'),
      workflow,
      workflowExecutionId: 'execution-1',
      inputs: {
        event: {
          alerts: [
            { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
            { _id: 'alert-2', _index: '.alerts-security.alerts-default' },
          ],
        },
      },
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

  it('records the observable key and value from the workflow event', async () => {
    const casesClient = createCasesClientMock();
    const definition = createCasesWorkflowExecutionContextDefinition(
      'cases.observable',
      jest.fn().mockResolvedValue(casesClient)
    );

    await definition.onExecutionStarted?.({
      request: httpServerMock.createKibanaRequest(),
      executionContext: createObservableWorkflowExecutionContext('observable-1', 'case-1'),
      workflow,
      workflowExecutionId: 'execution-1',
      inputs: {
        event: {
          observables: [
            { id: 'observable-1', typeKey: 'ip', value: '10.0.0.8' },
            { id: 'observable-2', typeKey: 'host', value: 'host-2' },
          ],
        },
      },
    });

    expect(casesClient.userActions.recordWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: {
          type: 'cases.observable',
          id: 'observable-1',
          typeKey: 'ip',
          value: '10.0.0.8',
        },
      })
    );
  });

  it('requires a case parent for a specific origin', async () => {
    const getCasesClient = jest.fn();
    const definition = createCasesWorkflowExecutionContextDefinition(
      'cases.observable',
      getCasesClient
    );

    await expect(
      definition.onExecutionStarted?.({
        request: httpServerMock.createKibanaRequest(),
        executionContext: { type: 'cases.observable', id: 'observable-1' },
        workflow,
        workflowExecutionId: 'execution-1',
        inputs: {},
      })
    ).rejects.toThrow(
      'Cases workflow execution context "cases.observable" requires a "cases.case" parent.'
    );
    expect(getCasesClient).not.toHaveBeenCalled();
  });

  it('propagates failures when recording workflow activity', async () => {
    const casesClient = createCasesClientMock();
    const error = new Error('failed to record workflow activity');
    casesClient.userActions.recordWorkflowExecution.mockRejectedValue(error);
    const definition = createCasesWorkflowExecutionContextDefinition(
      'cases.case',
      jest.fn().mockResolvedValue(casesClient)
    );

    await expect(
      definition.onExecutionStarted?.({
        request: httpServerMock.createKibanaRequest(),
        executionContext: createCaseWorkflowExecutionContext('case-1'),
        workflow,
        workflowExecutionId: 'execution-1',
        inputs: {},
      })
    ).rejects.toThrow(error);
  });

  it('registers every supported Cases context type', () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();

    registerCasesWorkflowExecutionContext(workflowsExtensions, jest.fn());

    expect(
      workflowsExtensions.registerExecutionContextDefinition.mock.calls.map(
        ([definition]) => definition.type
      )
    ).toEqual([
      'cases.case',
      'cases.observable',
      'cases.alert',
      'cases.alerts',
      'cases.comment',
      'cases.attachment',
    ]);
  });
});

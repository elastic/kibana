/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CommentAddedTriggerId,
} from '../../../common/workflows/triggers';
import { CasesEventBus } from '../../events/event_bus';
import { registerCasesWorkflowEventBridge } from './event_bridge';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

describe('registerCasesWorkflowEventBridge', () => {
  it('forwards cases events to workflows extensions', async () => {
    const eventBus = new CasesEventBus();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const logger = loggingSystemMock.createLogger();
    const request = httpServerMock.createKibanaRequest();

    const mockClient = { emitEvent: jest.fn() };
    workflowsExtensions.getClient.mockResolvedValue(mockClient);

    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);

    eventBus.emitCaseCreated(request, { caseId: 'case-1', owner: 'securitySolution' });
    eventBus.emitCaseUpdated(request, {
      caseId: 'case-1',
      owner: 'securitySolution',
      updatedFields: ['status'],
    });
    eventBus.emitCommentAdded(request, {
      caseId: 'case-1',
      caseCommentIds: [],
      owner: 'securitySolution',
    });

    await flushMicrotasks();

    expect(workflowsExtensions.getClient).toHaveBeenCalledTimes(3);
    expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
    expect(mockClient.emitEvent).toHaveBeenCalledTimes(3);
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, CaseCreatedTriggerId, {
      caseId: 'case-1',
      owner: 'securitySolution',
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, CaseUpdatedTriggerId, {
      caseId: 'case-1',
      owner: 'securitySolution',
      updatedFields: ['status'],
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(3, CommentAddedTriggerId, {
      caseId: 'case-1',
      caseCommentIds: [],
      owner: 'securitySolution',
    });
  });

  it('logs warning when forwarding fails', async () => {
    const eventBus = new CasesEventBus();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const logger = loggingSystemMock.createLogger();
    const request = httpServerMock.createKibanaRequest();

    const mockClient = { emitEvent: jest.fn().mockRejectedValue(new Error('boom')) };
    workflowsExtensions.getClient.mockResolvedValue(mockClient);
    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);

    eventBus.emitCaseCreated(request, { caseId: 'case-1', owner: 'securitySolution' });

    await flushMicrotasks();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to emit workflow trigger "${CaseCreatedTriggerId}"`)
    );
  });
});

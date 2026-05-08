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
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
  CaseStatusUpdatedTriggerId,
} from '../../../common/workflows/triggers';
import { CasesEventBus } from '../../events/event_bus';
import { registerCasesWorkflowEventBridge } from './event_bridge';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

describe('registerCasesWorkflowEventBridge', () => {
  const workflowsExtensions = workflowsExtensionsMock.createStart();
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  let mockClient = { emitEvent: jest.fn(), isWorkflowsAvailable: true };
  let eventBus = new CasesEventBus();

  beforeEach(() => {
    eventBus = new CasesEventBus();
    mockClient = { emitEvent: jest.fn(), isWorkflowsAvailable: true };
    workflowsExtensions.getClient.mockResolvedValue(mockClient);
    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);
  });

  it('forwards cases events to workflows extensions', async () => {
    eventBus.emitCaseCreated(request, { caseId: 'case-1', owner: 'securitySolution' });
    eventBus.emitCaseUpdated(
      request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['title'],
      },
      { previousCase: undefined, updatedCase: undefined }
    );
    eventBus.emitAttachmentsAdded(request, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'alert',
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
      updatedFields: ['title'],
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(3, AttachmentsAddedTriggerId, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'alert',
      owner: 'securitySolution',
    });
  });

  it('forwards a status trigger event if necessary', async () => {
    eventBus.emitCaseUpdated(
      request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['status'],
      },
      {
        // @ts-expect-error - we just care about the status
        previousCase: { attributes: { status: 'in-progress' } },
        // @ts-expect-error - we just care about the status
        updatedCase: { status: 'closed' },
      }
    );

    await flushMicrotasks();

    expect(mockClient.emitEvent).toHaveBeenCalledTimes(2);
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, CaseUpdatedTriggerId, {
      caseId: 'case-1',
      owner: 'securitySolution',
      updatedFields: ['status'],
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, CaseStatusUpdatedTriggerId, {
      caseId: 'case-1',
      owner: 'securitySolution',
      previousStatus: 'in-progress',
      status: 'closed',
    });
  });

  it('changes the legacy `user` attachment type to `comment`', async () => {
    eventBus.emitAttachmentsAdded(request, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'user',
      owner: 'securitySolution',
    });

    await flushMicrotasks();

    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, AttachmentsAddedTriggerId, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'comment',
      owner: 'securitySolution',
    });
  });

  it('emits comment added triggers when comment attachments were emitted', async () => {
    eventBus.emitAttachmentsAdded(request, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'comment',
      owner: 'securitySolution',
    });

    await flushMicrotasks();

    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, AttachmentsAddedTriggerId, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'comment',
      owner: 'securitySolution',
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, CommentsAddedTriggerId, {
      caseId: 'case-1',
      commentIds: ['attachment-1'],
      owner: 'securitySolution',
    });
  });

  it('logs warning when forwarding fails', async () => {
    mockClient = {
      emitEvent: jest.fn().mockRejectedValue(new Error('boom')),
      isWorkflowsAvailable: true,
    };
    workflowsExtensions.getClient.mockResolvedValue(mockClient);
    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);
    eventBus.emitCaseCreated(request, { caseId: 'case-1', owner: 'securitySolution' });

    await flushMicrotasks();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to emit workflow trigger "${CaseCreatedTriggerId}"`)
    );
  });
});

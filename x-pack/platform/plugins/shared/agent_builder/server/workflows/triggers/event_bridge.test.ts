/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  createWorkflowsClientMock,
  workflowsExtensionsMock,
} from '@kbn/workflows-extensions/server/mocks';
import { ConversationMetadataUpdatedTriggerId } from '../../../common/workflows/triggers';
import { createConversationEventBus } from './conversation_event_bus';
import { registerConversationWorkflowEventBridge } from './event_bridge';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const isExperimentalEnabled = jest.fn().mockResolvedValue(true);

describe('registerConversationWorkflowEventBridge', () => {
  const workflowsExtensions = workflowsExtensionsMock.createStart();
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  let mockClient = createWorkflowsClientMock();
  let eventBus = createConversationEventBus();

  beforeEach(() => {
    eventBus = createConversationEventBus();
    mockClient = createWorkflowsClientMock();
    isExperimentalEnabled.mockResolvedValue(true);
    workflowsExtensions.getClient.mockResolvedValue(mockClient);
    registerConversationWorkflowEventBridge(
      eventBus,
      workflowsExtensions,
      logger,
      isExperimentalEnabled
    );
  });

  it('forwards metadata patched events to workflows extensions', async () => {
    eventBus.emitMetadataPatched(request, {
      conversationId: 'conv-1',
      templateId: 'investigation',
      changedFields: ['status', 'severity'],
    });

    await flushMicrotasks();

    expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
    expect(mockClient.emitEvent).toHaveBeenCalledWith(ConversationMetadataUpdatedTriggerId, {
      conversationId: 'conv-1',
      templateId: 'investigation',
      changedFields: ['status', 'severity'],
    });
  });

  it('forwards parent id when present', async () => {
    eventBus.emitMetadataPatched(request, {
      conversationId: 'child-conv',
      templateId: 'proposal',
      parentId: 'parent-conv',
      changedFields: ['decision'],
    });

    await flushMicrotasks();

    expect(mockClient.emitEvent).toHaveBeenCalledWith(ConversationMetadataUpdatedTriggerId, {
      conversationId: 'child-conv',
      templateId: 'proposal',
      parentId: 'parent-conv',
      changedFields: ['decision'],
    });
  });

  it('does nothing when workflowsExtensions is undefined', async () => {
    const isolatedBus = createConversationEventBus();
    registerConversationWorkflowEventBridge(isolatedBus, undefined, logger, isExperimentalEnabled);

    isolatedBus.emitMetadataPatched(request, {
      conversationId: 'conv-1',
      changedFields: ['status'],
    });

    await flushMicrotasks();

    // The mock from the outer beforeEach still has 0 calls since we used a fresh bus
    expect(mockClient.emitEvent).not.toHaveBeenCalled();
  });

  it('does not emit the trigger when experimental features are disabled', async () => {
    isExperimentalEnabled.mockResolvedValue(false);
    const disabledBus = createConversationEventBus();
    registerConversationWorkflowEventBridge(
      disabledBus,
      workflowsExtensions,
      logger,
      isExperimentalEnabled
    );

    disabledBus.emitMetadataPatched(request, {
      conversationId: 'conv-1',
      changedFields: ['status'],
    });

    await flushMicrotasks();

    expect(mockClient.emitEvent).not.toHaveBeenCalled();
  });

  it('logs a warning when forwarding fails', async () => {
    const failingClient = createWorkflowsClientMock({
      emitEvent: jest.fn().mockRejectedValue(new Error('network error')),
    });
    workflowsExtensions.getClient.mockResolvedValue(failingClient);
    const failBus = createConversationEventBus();
    registerConversationWorkflowEventBridge(
      failBus,
      workflowsExtensions,
      logger,
      isExperimentalEnabled
    );

    failBus.emitMetadataPatched(request, {
      conversationId: 'conv-1',
      changedFields: ['status'],
    });

    await flushMicrotasks();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Failed to emit workflow trigger "${ConversationMetadataUpdatedTriggerId}"`
      )
    );
  });
});

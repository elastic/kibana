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
import { TimelineEventType, EventActorType } from '@kbn/agent-builder-common';
import type { AttachmentTimelineEvent } from '@kbn/agent-builder-common';
import {
  ConversationMetadataUpdatedTriggerId,
  ConversationAttachmentAddedTriggerId,
  ConversationAttachmentUpdatedTriggerId,
  ConversationAttachmentDeletedTriggerId,
} from '../../../common/workflows/triggers';
import { createConversationEventBus } from './conversation_event_bus';
import { registerConversationWorkflowEventBridge } from './event_bridge';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const isExperimentalEnabled = jest.fn().mockResolvedValue(true);

const systemActor = { type: EventActorType.system, id: 'system' };
const addedEvent: AttachmentTimelineEvent = {
  id: 'evt-1',
  type: TimelineEventType.attachmentAdded,
  created_at: '2026-09-16T10:00:00.000Z',
  actor: systemActor,
  data: {
    attachment_id: 'att-1',
    attachment_type: 'text',
    current_version: 1,
    render_inline: true,
    source: 'workflow',
  },
};
const updatedEvent: AttachmentTimelineEvent = {
  id: 'evt-2',
  type: TimelineEventType.attachmentUpdated,
  created_at: '2026-09-16T10:00:01.000Z',
  actor: systemActor,
  data: {
    attachment_id: 'att-1',
    attachment_type: 'text',
    previous_version: 1,
    current_version: 2,
    render_inline: false,
    source: 'http_api',
  },
};
const deletedEvent: AttachmentTimelineEvent = {
  id: 'evt-3',
  type: TimelineEventType.attachmentDeleted,
  created_at: '2026-09-16T10:00:02.000Z',
  actor: systemActor,
  data: { attachment_id: 'att-1', attachment_type: 'text', hard_delete: true, source: 'execution' },
};

describe('registerConversationWorkflowEventBridge', () => {
  const workflowsExtensions = workflowsExtensionsMock.createStart();
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  let mockClient = createWorkflowsClientMock();
  let eventBus = createConversationEventBus();

  beforeEach(() => {
    eventBus = createConversationEventBus();
    mockClient = createWorkflowsClientMock();
    isExperimentalEnabled.mockClear();
    workflowsExtensions.getClient.mockClear();
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

  describe('attachment events', () => {
    it('maps attachment_added to ai.attachmentAdded with a camelCase payload without renderInline', async () => {
      eventBus.emitAttachmentEvents(request, { conversationId: 'conv-1', events: [addedEvent] });
      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenCalledWith(ConversationAttachmentAddedTriggerId, {
        conversationId: 'conv-1',
        attachmentId: 'att-1',
        attachmentType: 'text',
        currentVersion: 1,
        source: 'workflow',
      });
    });

    it('maps attachment_updated to ai.attachmentUpdated', async () => {
      eventBus.emitAttachmentEvents(request, { conversationId: 'conv-1', events: [updatedEvent] });
      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenCalledWith(ConversationAttachmentUpdatedTriggerId, {
        conversationId: 'conv-1',
        attachmentId: 'att-1',
        attachmentType: 'text',
        previousVersion: 1,
        currentVersion: 2,
        source: 'http_api',
      });
    });

    it('maps attachment_deleted to ai.attachmentDeleted', async () => {
      eventBus.emitAttachmentEvents(request, { conversationId: 'conv-1', events: [deletedEvent] });
      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenCalledWith(ConversationAttachmentDeletedTriggerId, {
        conversationId: 'conv-1',
        attachmentId: 'att-1',
        attachmentType: 'text',
        hardDelete: true,
        source: 'execution',
      });
    });

    it('checks the flag and resolves the client once per batch, then emits once per event', async () => {
      eventBus.emitAttachmentEvents(request, {
        conversationId: 'conv-1',
        events: [addedEvent, updatedEvent, deletedEvent],
      });
      await flushMicrotasks();

      expect(isExperimentalEnabled).toHaveBeenCalledTimes(1);
      expect(workflowsExtensions.getClient).toHaveBeenCalledTimes(1);
      expect(mockClient.emitEvent).toHaveBeenCalledTimes(3);
    });

    it('does not emit attachment triggers when experimental features are disabled', async () => {
      isExperimentalEnabled.mockResolvedValue(false);
      eventBus.emitAttachmentEvents(request, { conversationId: 'conv-1', events: [addedEvent] });
      await flushMicrotasks();

      expect(mockClient.emitEvent).not.toHaveBeenCalled();
    });

    it('warns and continues when one emitEvent rejects', async () => {
      (mockClient.emitEvent as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue(undefined);

      eventBus.emitAttachmentEvents(request, {
        conversationId: 'conv-1',
        events: [addedEvent, updatedEvent],
      });
      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to emit workflow trigger "${ConversationAttachmentAddedTriggerId}"`
        )
      );
    });
  });
});

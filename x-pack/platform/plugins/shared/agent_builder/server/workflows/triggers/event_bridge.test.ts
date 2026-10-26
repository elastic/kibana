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
import type {
  AttachmentTimelineEvent,
  ConversationUpdatedTriggerEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationMetadataUpdatedTriggerId,
  ConversationAttachmentAddedTriggerId,
  ConversationAttachmentUpdatedTriggerId,
  ConversationAttachmentDeletedTriggerId,
  ConversationUpdatedTriggerId,
} from '../../../common/workflows/triggers';
import type { ConversationUpdatedOptIn } from '@kbn/agent-builder-server';
import { createConversationEventBus } from './conversation_event_bus';
import { registerConversationWorkflowEventBridge } from './event_bridge';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

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
    workflowsExtensions.getClient.mockClear();
    workflowsExtensions.getClient.mockResolvedValue(mockClient);
    // `ai.conversation.updated` is opt-in; the gate itself is covered in its own describe below.
    registerConversationWorkflowEventBridge(eventBus, workflowsExtensions, logger, [
      { templateIds: ['investigation'], isEnabled: async () => true },
    ]);
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
    registerConversationWorkflowEventBridge(isolatedBus, undefined, logger, []);

    isolatedBus.emitMetadataPatched(request, {
      conversationId: 'conv-1',
      changedFields: ['status'],
    });

    await flushMicrotasks();

    // The mock from the outer beforeEach still has 0 calls since we used a fresh bus
    expect(mockClient.emitEvent).not.toHaveBeenCalled();
  });

  it('logs a warning when forwarding fails', async () => {
    const failingClient = createWorkflowsClientMock({
      emitEvent: jest.fn().mockRejectedValue(new Error('network error')),
    });
    workflowsExtensions.getClient.mockResolvedValue(failingClient);
    const failBus = createConversationEventBus();
    registerConversationWorkflowEventBridge(failBus, workflowsExtensions, logger, []);

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

    it('resolves the client once per batch, then emits once per event', async () => {
      eventBus.emitAttachmentEvents(request, {
        conversationId: 'conv-1',
        events: [addedEvent, updatedEvent, deletedEvent],
      });
      await flushMicrotasks();

      expect(workflowsExtensions.getClient).toHaveBeenCalledTimes(1);
      expect(mockClient.emitEvent).toHaveBeenCalledTimes(3);
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

  describe('ai.conversation.updated', () => {
    const payload: ConversationUpdatedTriggerEvent = {
      conversationId: 'conv-1',
      templateId: 'investigation',
      source: 'execution',
      changeKinds: ['events'],
      eventTypes: ['user_message'],
      actorTypes: ['user'],
      attachmentTypes: [],
      attachmentIds: [],
      changedFields: [],
    };

    it('forwards conversation updated events to workflows extensions', async () => {
      eventBus.emitConversationUpdated(request, payload);

      await flushMicrotasks();

      expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
      expect(mockClient.emitEvent).toHaveBeenCalledWith(ConversationUpdatedTriggerId, payload);
    });

    it('logs a warning when the emit fails', async () => {
      (mockClient.emitEvent as jest.Mock).mockRejectedValue(new Error('network error'));

      eventBus.emitConversationUpdated(request, payload);

      await flushMicrotasks();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to emit workflow trigger "${ConversationUpdatedTriggerId}"`)
      );
    });

    describe('opt-in gate', () => {
      const investigationOptIn = (
        isEnabled: ConversationUpdatedOptIn['isEnabled']
      ): ConversationUpdatedOptIn => ({ templateIds: ['investigation'], isEnabled });

      /** Emits on a bus gated by `optIns` and resolves once the forward had a chance to run. */
      const emitWithOptIns = async (
        optIns: ConversationUpdatedOptIn[],
        event: ConversationUpdatedTriggerEvent = payload
      ) => {
        const gatedBus = createConversationEventBus();
        registerConversationWorkflowEventBridge(gatedBus, workflowsExtensions, logger, optIns);

        gatedBus.emitConversationUpdated(request, event);
        await flushMicrotasks();
      };

      it('should not emit when no opt-in is registered', async () => {
        await emitWithOptIns([]);

        expect(workflowsExtensions.getClient).not.toHaveBeenCalled();
        expect(mockClient.emitEvent).not.toHaveBeenCalled();
      });

      it('should not emit when every matching opt-in resolves false', async () => {
        await emitWithOptIns([
          investigationOptIn(async () => false),
          investigationOptIn(async () => false),
        ]);

        expect(workflowsExtensions.getClient).not.toHaveBeenCalled();
        expect(mockClient.emitEvent).not.toHaveBeenCalled();
      });

      it('should emit when any matching opt-in resolves true', async () => {
        await emitWithOptIns([
          investigationOptIn(async () => false),
          investigationOptIn(async () => true),
        ]);

        expect(mockClient.emitEvent).toHaveBeenCalledWith(ConversationUpdatedTriggerId, payload);
      });

      it('should warn and keep evaluating when a check throws', async () => {
        await emitWithOptIns([
          investigationOptIn(async () => {
            throw new Error('settings unavailable');
          }),
          investigationOptIn(async () => true),
        ]);

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            `Failed to check whether "${ConversationUpdatedTriggerId}" is enabled`
          )
        );
        expect(mockClient.emitEvent).toHaveBeenCalledWith(ConversationUpdatedTriggerId, payload);
      });

      it('should pass the emitting request to each matching check', async () => {
        const firstCheck = jest.fn().mockResolvedValue(false);
        const secondCheck = jest.fn().mockResolvedValue(false);

        await emitWithOptIns([investigationOptIn(firstCheck), investigationOptIn(secondCheck)]);

        expect(firstCheck).toHaveBeenCalledWith(request);
        expect(secondCheck).toHaveBeenCalledWith(request);
      });

      it('should not run checks or emit when the conversation has no template', async () => {
        const isEnabled = jest.fn().mockResolvedValue(true);

        await emitWithOptIns([investigationOptIn(isEnabled)], {
          ...payload,
          templateId: undefined,
        });

        expect(isEnabled).not.toHaveBeenCalled();
        expect(mockClient.emitEvent).not.toHaveBeenCalled();
      });

      it('should not run checks registered for other templates', async () => {
        const escalationCheck = jest.fn().mockResolvedValue(true);

        await emitWithOptIns([{ templateIds: ['escalation'], isEnabled: escalationCheck }]);

        expect(escalationCheck).not.toHaveBeenCalled();
        expect(mockClient.emitEvent).not.toHaveBeenCalled();
      });
    });
  });
});

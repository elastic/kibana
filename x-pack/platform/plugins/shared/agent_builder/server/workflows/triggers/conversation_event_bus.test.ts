/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { TimelineEventType, EventActorType } from '@kbn/agent-builder-common';
import type {
  AttachmentTimelineEvent,
  ConversationUpdatedTriggerEvent,
} from '@kbn/agent-builder-common';
import {
  createConversationEventBus,
  createScopedConversationEventEmitter,
} from './conversation_event_bus';

const addedEvent: AttachmentTimelineEvent = {
  id: 'evt-1',
  type: TimelineEventType.attachmentAdded,
  created_at: '2026-09-16T10:00:00.000Z',
  actor: { type: EventActorType.system, id: 'system' },
  data: {
    attachment_id: 'att-1',
    attachment_type: 'text',
    current_version: 1,
    render_inline: false,
    source: 'http_api',
  },
};

const updatedEvent: ConversationUpdatedTriggerEvent = {
  conversationId: 'conv-1',
  source: 'http_api',
  changeKinds: ['title'],
  eventTypes: [],
  actorTypes: [],
  attachmentTypes: [],
  attachmentIds: [],
  changedFields: [],
};

describe('ConversationEventBus conversation updated events', () => {
  it('fans out emitConversationUpdated to every registered listener with the request', () => {
    const bus = createConversationEventBus();
    const request = httpServerMock.createKibanaRequest();
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    bus.onConversationUpdated(listenerA);
    bus.onConversationUpdated(listenerB);

    bus.emitConversationUpdated(request, updatedEvent);

    expect(listenerA).toHaveBeenCalledWith(request, updatedEvent);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('binds the request in the scoped emitter', () => {
    const bus = createConversationEventBus();
    const request = httpServerMock.createKibanaRequest();
    const listener = jest.fn();
    bus.onConversationUpdated(listener);

    createScopedConversationEventEmitter(bus, request).emitConversationUpdated(updatedEvent);

    expect(listener).toHaveBeenCalledWith(request, updatedEvent);
  });

  it('does not deliver conversation updated events to metadata or attachment listeners', () => {
    const bus = createConversationEventBus();
    const metadataListener = jest.fn();
    const attachmentListener = jest.fn();
    bus.onMetadataPatched(metadataListener);
    bus.onAttachmentEvents(attachmentListener);

    bus.emitConversationUpdated(httpServerMock.createKibanaRequest(), updatedEvent);

    expect(metadataListener).not.toHaveBeenCalled();
    expect(attachmentListener).not.toHaveBeenCalled();
  });
});

describe('ConversationEventBus attachment events', () => {
  it('fans out emitAttachmentEvents to every registered listener with the request', () => {
    const bus = createConversationEventBus();
    const request = httpServerMock.createKibanaRequest();
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    bus.onAttachmentEvents(listenerA);
    bus.onAttachmentEvents(listenerB);

    bus.emitAttachmentEvents(request, { conversationId: 'conv-1', events: [addedEvent] });

    expect(listenerA).toHaveBeenCalledWith(request, {
      conversationId: 'conv-1',
      events: [addedEvent],
    });
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('does not deliver attachment events to metadata listeners', () => {
    const bus = createConversationEventBus();
    const metadataListener = jest.fn();
    bus.onMetadataPatched(metadataListener);

    bus.emitAttachmentEvents(httpServerMock.createKibanaRequest(), {
      conversationId: 'conv-1',
      events: [addedEvent],
    });

    expect(metadataListener).not.toHaveBeenCalled();
  });
});

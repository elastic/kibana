/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { TimelineEventType, EventActorType } from '@kbn/agent-builder-common';
import type { AttachmentTimelineEvent } from '@kbn/agent-builder-common';
import { createConversationEventBus } from './conversation_event_bus';

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

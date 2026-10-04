/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EventActorType,
  TimelineEventType,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import { describeConversationWrite } from './describe_conversation_write';

const event = (type: string): ConversationEvent => ({
  id: `evt-${type}`,
  type,
  created_at: '2026-09-27T00:00:00.000Z',
  actor: { type: EventActorType.user, id: 'user-1' },
  data: {},
});

describe('describeConversationWrite', () => {
  it('marks a user message as a content change', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        templateId: 'investigation',
        events: [event(TimelineEventType.userMessage)],
      })
    ).toMatchObject({
      changeKinds: ['event'],
      eventTypes: ['user_message'],
      contentChange: true,
      summaryOnly: false,
    });
  });

  it('marks an attachment add as both an event and an attachment', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        events: [event(TimelineEventType.attachmentAdded)],
      })
    ).toMatchObject({
      changeKinds: ['event', 'attachment'],
      contentChange: true,
      summaryOnly: false,
    });
  });

  it('does not treat an execution step as content', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        events: [event(TimelineEventType.executionStep)],
      })
    ).toMatchObject({
      changeKinds: ['event'],
      contentChange: false,
      summaryOnly: false,
    });
  });

  it('treats a custom event as content', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        events: [event('worker_note')],
      })?.contentChange
    ).toBe(true);
  });

  it('flags a summary-only metadata write so the summarizer does not retrigger', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        changedFields: ['summary'],
      })
    ).toMatchObject({
      changeKinds: ['metadata'],
      contentChange: false,
      summaryOnly: true,
    });
  });

  it('treats closing an investigation as content', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        templateId: 'investigation',
        changedFields: ['status'],
      })
    ).toMatchObject({
      contentChange: true,
      summaryOnly: false,
      changedFields: ['status'],
    });
  });

  it('returns undefined when nothing changed', () => {
    expect(describeConversationWrite({ conversationId: 'conv-1' })).toBeUndefined();
  });
});

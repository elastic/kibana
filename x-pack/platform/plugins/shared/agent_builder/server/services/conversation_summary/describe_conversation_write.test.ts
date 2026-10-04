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
  it('treats a user message as content worth summarizing', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        templateId: 'investigation',
        events: [event(TimelineEventType.userMessage)],
      })?.contentChange
    ).toBe(true);
  });

  it('ignores execution steps', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        events: [event(TimelineEventType.executionStep)],
      })?.contentChange
    ).toBe(false);
  });

  it('does not reschedule when the only change is the summary field', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        changedFields: ['summary'],
      })
    ).toMatchObject({ contentChange: false, summaryOnly: true });
  });

  it('uses the template summary field when it is not named summary', () => {
    expect(
      describeConversationWrite({
        conversationId: 'conv-1',
        changedFields: ['brief'],
        summaryField: 'brief',
      })?.summaryOnly
    ).toBe(true);
  });
});

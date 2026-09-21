/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BUILT_IN_CONVERSATION_EVENT_TYPES,
  EventActorType,
  TimelineEventType,
  assertValidConversationEventType,
  isAttachmentEvent,
  isBuiltInConversationEventType,
  isExecutionTerminalEvent,
} from './timeline_events';

describe('isExecutionTerminalEvent', () => {
  it.each([
    TimelineEventType.executionTerminated,
    TimelineEventType.executionFailed,
    TimelineEventType.executionAborted,
  ])('is true for %s', (type) => {
    expect(isExecutionTerminalEvent({ type })).toBe(true);
  });

  it.each([
    TimelineEventType.executionStarted,
    TimelineEventType.executionStep,
    TimelineEventType.userMessage,
    TimelineEventType.attachmentAdded,
  ])('is false for %s', (type) => {
    expect(isExecutionTerminalEvent({ type })).toBe(false);
  });
});

describe('attachment timeline events', () => {
  const actor = { type: EventActorType.system, id: 'system' };

  it.each([
    TimelineEventType.attachmentAdded,
    TimelineEventType.attachmentUpdated,
    TimelineEventType.attachmentDeleted,
  ])('isAttachmentEvent returns true for %s', (type) => {
    const event = { id: 'e1', type, data: {}, created_at: 'now', actor };
    expect(isAttachmentEvent(event)).toBe(true);
  });

  it('isAttachmentEvent returns false for a non-attachment event', () => {
    expect(isAttachmentEvent({ type: TimelineEventType.userMessage })).toBe(false);
    expect(isAttachmentEvent({ type: 'my_custom_event' })).toBe(false);
  });

  it.each(['attachment_added', 'attachment_updated', 'attachment_deleted'])(
    '%s is a built-in conversation event type',
    (type) => {
      expect(isBuiltInConversationEventType(type)).toBe(true);
      expect(BUILT_IN_CONVERSATION_EVENT_TYPES).toContain(type);
    }
  );
});

describe('assertValidConversationEventType', () => {
  it('accepts a valid custom type', () => {
    expect(() => assertValidConversationEventType('my.custom_event')).not.toThrow();
    expect(() => assertValidConversationEventType('text_note')).not.toThrow();
    expect(() => assertValidConversationEventType('a.b.c')).not.toThrow();
  });

  it('throws when the type contains the id delimiter "::"', () => {
    expect(() => assertValidConversationEventType('bad::type')).toThrow('must not contain "::"');
  });

  it('throws when the type is the reserved word "execution"', () => {
    expect(() => assertValidConversationEventType('execution')).toThrow('reserved');
  });

  it('throws when the type is the reserved word "step"', () => {
    expect(() => assertValidConversationEventType('step')).toThrow('reserved');
  });

  it('throws for every built-in timeline event type', () => {
    for (const builtInType of BUILT_IN_CONVERSATION_EVENT_TYPES) {
      expect(() => assertValidConversationEventType(builtInType)).toThrow(
        'built-in timeline event type'
      );
    }
  });
});

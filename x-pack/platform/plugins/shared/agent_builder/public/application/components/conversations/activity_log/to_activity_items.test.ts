/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationAccessControlRole,
  ConversationActivityEventType,
  EventActorType,
  TimelineEventType,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import {
  findTriggeringUser,
  getEventParticipants,
  getTemplateDisplayName,
  isListedActivityEvent,
  resolveTimeZone,
  toActivityItems,
} from './to_activity_items';

const user = { type: EventActorType.user, id: 'alex' };
const agent = { type: EventActorType.agent, id: 'nightshift' };

const event = (
  id: string,
  type: string,
  createdAt = '2026-06-01T10:00:00Z',
  overrides: Partial<ConversationEvent> = {}
): ConversationEvent => ({
  id,
  type,
  data: {},
  created_at: createdAt,
  actor: user,
  ...overrides,
});

describe('isListedActivityEvent', () => {
  it.each([
    ConversationActivityEventType.conversationCreated,
    ConversationActivityEventType.titleUpdated,
    ConversationActivityEventType.participantsAdded,
    ConversationActivityEventType.participantsRemoved,
    ConversationActivityEventType.visibilityUpdated,
    TimelineEventType.attachmentAdded,
    TimelineEventType.attachmentUpdated,
  ])('lists %s', (type) => {
    expect(isListedActivityEvent(event('e', type))).toBe(true);
  });

  it.each([
    ConversationActivityEventType.metadataUpdated,
    TimelineEventType.attachmentDeleted,
    TimelineEventType.userMessage,
    TimelineEventType.executionStarted,
  ])('does not list %s', (type) => {
    expect(isListedActivityEvent(event('e', type))).toBe(false);
  });
});

describe('hidden attachments', () => {
  const attachmentEvent = (type: string, hidden?: boolean) =>
    event('e', type, undefined, {
      data: {
        attachment_id: 'a1',
        attachment_type: 'screen_context',
        source: 'chat_input',
        hidden,
      },
    });

  it.each([TimelineEventType.attachmentAdded, TimelineEventType.attachmentUpdated])(
    'does not list a hidden %s event',
    (type) => {
      expect(isListedActivityEvent(attachmentEvent(type, true))).toBe(false);
    }
  );

  it.each([TimelineEventType.attachmentAdded, TimelineEventType.attachmentUpdated])(
    'lists a %s event that is not hidden',
    (type) => {
      expect(isListedActivityEvent(attachmentEvent(type, false))).toBe(true);
      expect(isListedActivityEvent(attachmentEvent(type))).toBe(true);
    }
  );

  it('leaves out hidden attachments when building the log', () => {
    const result = toActivityItems([
      event('visible', TimelineEventType.attachmentAdded, undefined, {
        data: { attachment_id: 'a1', attachment_type: 'dashboard', source: 'execution' },
      }),
      event('hidden', TimelineEventType.attachmentAdded, undefined, {
        data: {
          attachment_id: 'a2',
          attachment_type: 'screen_context',
          source: 'chat_input',
          hidden: true,
        },
      }),
    ]);

    expect(result.map(({ id }) => id)).toEqual(['visible']);
  });
});

describe('toActivityItems', () => {
  it('returns an empty list when there are no events', () => {
    expect(toActivityItems(undefined)).toEqual([]);
    expect(toActivityItems([])).toEqual([]);
  });

  it('keeps only the events the log lists', () => {
    const result = toActivityItems([
      event('created', ConversationActivityEventType.conversationCreated),
      event('message', TimelineEventType.userMessage),
      event('metadata', ConversationActivityEventType.metadataUpdated),
      event('deleted', TimelineEventType.attachmentDeleted),
      event('added', TimelineEventType.attachmentAdded),
    ]);

    expect(result.map(({ id }) => id)).toEqual(['created', 'added']);
  });

  it('orders events oldest first', () => {
    const result = toActivityItems([
      event('late', ConversationActivityEventType.titleUpdated, '2026-06-01T12:00:00Z'),
      event('early', ConversationActivityEventType.conversationCreated, '2026-06-01T10:00:00Z'),
    ]);

    expect(result.map(({ id }) => id)).toEqual(['early', 'late']);
  });

  it('orders by time when timestamps use different precision', () => {
    const result = toActivityItems([
      event('whole', ConversationActivityEventType.titleUpdated, '2026-06-01T10:00:00Z'),
      event('fraction', ConversationActivityEventType.titleUpdated, '2026-06-01T10:00:00.123Z'),
      event('earlier', ConversationActivityEventType.titleUpdated, '2026-06-01T09:59:59.999Z'),
    ]);

    expect(result.map(({ id }) => id)).toEqual(['earlier', 'whole', 'fraction']);
  });

  it('does not change the events it is given', () => {
    const events = [
      event('late', ConversationActivityEventType.titleUpdated, '2026-06-01T12:00:00Z'),
      event('early', ConversationActivityEventType.titleUpdated, '2026-06-01T10:00:00Z'),
    ];

    toActivityItems(events);

    expect(events.map(({ id }) => id)).toEqual(['late', 'early']);
  });
});

describe('findTriggeringUser', () => {
  const message = event('msg-1', TimelineEventType.userMessage);
  const started = event('started-1', TimelineEventType.executionStarted, '2026-06-01T10:00:01Z', {
    actor: agent,
    execution_id: 'exec-1',
    trigger_event_id: 'msg-1',
  });
  const agentChange = event(
    'title-1',
    ConversationActivityEventType.titleUpdated,
    '2026-06-01T10:00:02Z',
    { actor: agent, execution_id: 'exec-1' }
  );
  const [change] = toActivityItems([agentChange]);

  it('returns the user whose message triggered the agent run', () => {
    expect(findTriggeringUser(change, [message, started, agentChange])).toEqual(user);
  });

  it('returns undefined for a change that was not made by an agent', () => {
    const [userChange] = toActivityItems([
      event('title-2', ConversationActivityEventType.titleUpdated),
    ]);

    expect(findTriggeringUser(userChange, [message, started])).toBeUndefined();
  });

  it('returns undefined when the agent change has no execution id', () => {
    const [noExecution] = toActivityItems([
      event('title-3', ConversationActivityEventType.titleUpdated, undefined, { actor: agent }),
    ]);

    expect(findTriggeringUser(noExecution, [message, started])).toBeUndefined();
  });

  it('returns undefined when the run cannot be traced back to a trigger', () => {
    expect(findTriggeringUser(change, [agentChange])).toBeUndefined();
    expect(findTriggeringUser(change)).toBeUndefined();
  });

  it('returns undefined when the trigger was not made by a user', () => {
    const agentMessage = { ...message, actor: agent };

    expect(findTriggeringUser(change, [agentMessage, started, agentChange])).toBeUndefined();
  });
});

describe('getEventParticipants', () => {
  const participants = [
    { type: 'user' as const, id: 'sam', role: ConversationAccessControlRole.Member },
  ];

  it.each([
    ConversationActivityEventType.participantsAdded,
    ConversationActivityEventType.participantsRemoved,
  ])('returns the participants of %s', (type) => {
    const [participantEvent] = toActivityItems([
      event('e', type, undefined, { data: { participants } }),
    ]);

    expect(getEventParticipants(participantEvent)).toEqual(participants);
  });

  it('returns no participants for other events', () => {
    const [titleEvent] = toActivityItems([event('e', ConversationActivityEventType.titleUpdated)]);

    expect(getEventParticipants(titleEvent)).toEqual([]);
  });
});

describe('getTemplateDisplayName', () => {
  it('prefers the registered name', () => {
    expect(getTemplateDisplayName('escalation', 'Escalation case')).toBe('Escalation case');
  });

  it('makes the id readable when no name is registered', () => {
    expect(getTemplateDisplayName('escalation')).toBe('Escalation');
    expect(getTemplateDisplayName('network_incident-review')).toBe('Network incident review');
  });
});

describe('resolveTimeZone', () => {
  it('returns undefined when nothing is configured or the browser timezone is', () => {
    expect(resolveTimeZone(undefined)).toBeUndefined();
    expect(resolveTimeZone('')).toBeUndefined();
    expect(resolveTimeZone('Browser')).toBeUndefined();
  });

  it('returns a timezone the browser knows', () => {
    expect(resolveTimeZone('UTC')).toBe('UTC');
    expect(resolveTimeZone('Europe/Kyiv')).toBe('Europe/Kyiv');
  });

  it('falls back to the browser timezone for an unknown name', () => {
    expect(resolveTimeZone('Mars/Base')).toBeUndefined();
  });
});

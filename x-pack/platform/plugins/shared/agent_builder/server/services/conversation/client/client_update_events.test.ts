/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventType, type TimelineEvent } from '@kbn/agent-builder-common';

const resolveEventsForUpdate = ({
  storedEvents,
  updateEvents,
  auditEvents = [],
}: {
  storedEvents?: TimelineEvent[];
  updateEvents?: TimelineEvent[];
  auditEvents?: TimelineEvent[];
}): TimelineEvent[] => {
  let events = updateEvents ?? storedEvents ?? [];

  if (auditEvents.length > 0) {
    events = [...events, ...auditEvents];
  }

  return events;
};

describe('conversation update events merge', () => {
  const storedEvents = [
    {
      id: 'old-message',
      timestamp: '2026-06-02T00:00:00.000Z',
      type: TimelineEventType.user_message,
      user: { username: 'analyst_a' },
      message: '@agent triage this alert',
    },
  ];

  const appendedEvents = [
    ...storedEvents,
    {
      id: 'new-message',
      timestamp: '2026-06-03T03:49:06.154Z',
      type: TimelineEventType.user_message,
      user: { username: 'analyst_a' },
      message: 'test2',
    },
  ];

  it('keeps appended events when an update explicitly provides events', () => {
    const events = resolveEventsForUpdate({
      storedEvents,
      updateEvents: appendedEvents,
    });

    expect(events.at(-1)).toMatchObject({ id: 'new-message', message: 'test2' });
  });

  it('documents the previous overwrite bug when stored events clobber update events', () => {
    const buggyEvents = storedEvents ?? [];
    const mergedUpdate = {
      events: appendedEvents,
      ...(buggyEvents.length > 0 && { events: buggyEvents }),
    };

    expect(mergedUpdate.events.at(-1)).toMatchObject({
      id: 'old-message',
      message: '@agent triage this alert',
    });
  });
});

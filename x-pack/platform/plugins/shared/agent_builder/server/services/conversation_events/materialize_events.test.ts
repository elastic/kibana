/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventActorType, CONVERSATION_EVENT_ID_DELIMITER } from '@kbn/agent-builder-common';
import { materializeConversationEvents } from './materialize_events';

const now = new Date('2026-09-14T12:00:00.000Z');

const callerActor = {
  type: EventActorType.user,
  id: 'user-1',
  username: 'tester',
};

const validatedNote = { type: 'scratch.note', data: { note: 'hello' } };

describe('materializeConversationEvents', () => {
  it('stamps id, actor, and created_at onto each event', () => {
    const result = materializeConversationEvents({
      events: [validatedNote],
      actor: callerActor,
      now,
    });

    expect(result).toHaveLength(1);
    const [event] = result;
    expect(event.type).toBe('scratch.note');
    expect(event.data).toEqual({ note: 'hello' });
    expect(event.actor).toBe(callerActor);
    expect(event.created_at).toBe(now.toISOString());
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
  });

  it('generated ids never contain the :: delimiter', () => {
    for (let i = 0; i < 20; i++) {
      const [event] = materializeConversationEvents({
        events: [{ type: 'scratch.note', data: { note: 'x' } }],
        actor: callerActor,
        now,
      });
      expect(event.id).not.toContain(CONVERSATION_EVENT_ID_DELIMITER);
    }
  });

  it('attributes events to the supplied actor', () => {
    const [event] = materializeConversationEvents({
      events: [validatedNote],
      actor: callerActor,
      now,
    });
    expect(event.actor).toEqual(callerActor);
  });

  it('works when the actor has no separate id field', () => {
    const actorWithUsernameOnly = { type: EventActorType.user, id: 'tester', username: 'tester' };
    const [event] = materializeConversationEvents({
      events: [validatedNote],
      actor: actorWithUsernameOnly,
      now,
    });
    expect(event.actor).toEqual(actorWithUsernameOnly);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { EventActorType } from '@kbn/agent-builder-common';
import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server/conversation_events';
import { CONVERSATION_EVENT_ID_DELIMITER } from '@kbn/agent-builder-common';
import { materializeConversationEvents } from './materialize_events';
import type { ConversationEventsServiceStart } from './types';

const now = new Date('2026-09-14T12:00:00.000Z');

const callerActor = {
  type: EventActorType.user,
  id: 'user-1',
  username: 'tester',
};

const noteSchema = z.object({ note: z.string().max(100) });

const noteDefinition: ConversationEventTypeDefinition = {
  type: 'scratch.note',
  payloadSchema: noteSchema,
};

const makeRegistry = (
  types: ConversationEventTypeDefinition[]
): Pick<ConversationEventsServiceStart, 'getDefinition'> => ({
  getDefinition: (type) => types.find((d) => d.type === type),
});

describe('materializeConversationEvents', () => {
  it('returns materialized events for valid inputs', () => {
    const registry = makeRegistry([noteDefinition]);
    const result = materializeConversationEvents({
      inputs: [{ type: 'scratch.note', data: { note: 'hello' } }],
      registry,
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
    const registry = makeRegistry([noteDefinition]);
    for (let i = 0; i < 20; i++) {
      const [event] = materializeConversationEvents({
        inputs: [{ type: 'scratch.note', data: { note: 'x' } }],
        registry,
        actor: callerActor,
        now,
      });
      expect(event.id).not.toContain(CONVERSATION_EVENT_ID_DELIMITER);
    }
  });

  it('throws 400 for an unregistered type', () => {
    const registry = makeRegistry([]);
    expect(() =>
      materializeConversationEvents({
        inputs: [{ type: 'not.registered', data: {} }],
        registry,
        actor: callerActor,
        now,
      })
    ).toThrow('Unknown conversation event type "not.registered"');
  });

  it('throws 400 for a built-in timeline event type with a distinct message', () => {
    // The check fires before the registry is consulted, so the registry can be empty.
    const registry = makeRegistry([]);
    expect(() =>
      materializeConversationEvents({
        inputs: [{ type: 'user_message', data: {} }],
        registry,
        actor: callerActor,
        now,
      })
    ).toThrow('internal and cannot be added directly');
  });

  it('throws 400 with Zod issue path on schema failure', () => {
    const registry = makeRegistry([noteDefinition]);
    expect(() =>
      materializeConversationEvents({
        inputs: [{ type: 'scratch.note', data: { note: 123 } }],
        registry,
        actor: callerActor,
        now,
      })
    ).toThrow('note');
  });

  it('rejects the whole batch when one event is invalid', () => {
    const registry = makeRegistry([noteDefinition]);
    expect(() =>
      materializeConversationEvents({
        inputs: [
          { type: 'scratch.note', data: { note: 'good' } },
          { type: 'scratch.note', data: { note: 123 } },
        ],
        registry,
        actor: callerActor,
        now,
      })
    ).toThrow();
  });

  it('attributes events to the supplied actor', () => {
    const registry = makeRegistry([noteDefinition]);
    const [event] = materializeConversationEvents({
      inputs: [{ type: 'scratch.note', data: { note: 'hi' } }],
      registry,
      actor: callerActor,
      now,
    });
    expect(event.actor).toEqual(callerActor);
  });

  it('works when the actor id is derived from username (no id field)', () => {
    const actorWithUsernameOnly = { type: EventActorType.user, id: 'tester', username: 'tester' };
    const registry = makeRegistry([noteDefinition]);
    const [event] = materializeConversationEvents({
      inputs: [{ type: 'scratch.note', data: { note: 'hi' } }],
      registry,
      actor: actorWithUsernameOnly,
      now,
    });
    expect(event.actor).toEqual(actorWithUsernameOnly);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server/conversation_events';
import { validateConversationEvents } from './validation';
import type { ConversationEventsServiceStart } from './types';

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

describe('validateConversationEvents', () => {
  it('returns validated events for valid inputs', () => {
    const registry = makeRegistry([noteDefinition]);
    const result = validateConversationEvents(
      [{ type: 'scratch.note', data: { note: 'hello' } }],
      registry
    );
    expect(result).toEqual([{ type: 'scratch.note', data: { note: 'hello' } }]);
  });

  it('throws 400 for an unregistered type', () => {
    const registry = makeRegistry([]);
    expect(() =>
      validateConversationEvents([{ type: 'not.registered', data: {} }], registry)
    ).toThrow('Unknown conversation event type "not.registered"');
  });

  it('throws 400 for a built-in timeline event type with a distinct message', () => {
    const registry = makeRegistry([]);
    expect(() =>
      validateConversationEvents([{ type: 'user_message', data: {} }], registry)
    ).toThrow('internal and cannot be added directly');
  });

  it('throws 400 with Zod issue path on schema failure', () => {
    const registry = makeRegistry([noteDefinition]);
    expect(() =>
      validateConversationEvents([{ type: 'scratch.note', data: { note: 123 } }], registry)
    ).toThrow('note');
  });

  it('rejects the whole batch when one event is invalid', () => {
    const registry = makeRegistry([noteDefinition]);
    expect(() =>
      validateConversationEvents(
        [
          { type: 'scratch.note', data: { note: 'good' } },
          { type: 'scratch.note', data: { note: 123 } },
        ],
        registry
      )
    ).toThrow();
  });
});

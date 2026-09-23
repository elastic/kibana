/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { z } from '@kbn/zod/v4';
import type {
  ConversationEventUIDefinition,
  ConversationEventsServiceStartContract,
} from '@kbn/agent-builder-browser';
import { BUILT_IN_CONVERSATION_EVENT_TYPES } from '@kbn/agent-builder-common';
import { ConversationEventsService } from './conversation_events_service';

const noteDefinition: ConversationEventUIDefinition = {
  type: 'scratch.note',
  payloadSchema: z.object({ text: z.string() }),
  render: () => null,
};

const alertDefinition: ConversationEventUIDefinition = {
  type: 'security.alert_triaged',
  payloadSchema: z.object({ alert_id: z.string() }),
  render: () => null,
};

describe('ConversationEventsService', () => {
  it('registers a definition and returns it via getUiDefinition', () => {
    const service = new ConversationEventsService();
    service.register(noteDefinition);

    expect(service.getUiDefinition('scratch.note')).toBe(noteDefinition);
  });

  it('reports registration via has', () => {
    const service = new ConversationEventsService();
    expect(service.has('scratch.note')).toBe(false);

    service.register(noteDefinition);
    expect(service.has('scratch.note')).toBe(true);
  });

  it('lists all registered definitions in insertion order', () => {
    const service = new ConversationEventsService();
    expect(service.list()).toEqual([]);

    service.register(noteDefinition);
    service.register(alertDefinition);

    expect(service.list()).toEqual([noteDefinition, alertDefinition]);
  });

  it('throws when registering a duplicate type', () => {
    const service = new ConversationEventsService();
    service.register(noteDefinition);

    expect(() => service.register(noteDefinition)).toThrow(
      'Conversation event type "scratch.note" is already registered.'
    );
  });

  it('throws when a type contains the id delimiter "::"', () => {
    const service = new ConversationEventsService();
    expect(() =>
      service.register({ type: 'bad::type', payloadSchema: z.object({}), render: () => null })
    ).toThrow('must not contain "::"');
  });

  it('throws when a type is the reserved word "execution"', () => {
    const service = new ConversationEventsService();
    expect(() =>
      service.register({ type: 'execution', payloadSchema: z.object({}), render: () => null })
    ).toThrow('reserved');
  });

  it('throws when a type is the reserved word "step"', () => {
    const service = new ConversationEventsService();
    expect(() =>
      service.register({ type: 'step', payloadSchema: z.object({}), render: () => null })
    ).toThrow('reserved');
  });

  it('throws for every built-in timeline event type', () => {
    const service = new ConversationEventsService();
    for (const builtInType of BUILT_IN_CONVERSATION_EVENT_TYPES) {
      expect(() =>
        service.register({ type: builtInType, payloadSchema: z.object({}), render: () => null })
      ).toThrow('built-in timeline event type');
    }
  });

  it('returns undefined / false for an unknown type', () => {
    const service = new ConversationEventsService();
    expect(service.getUiDefinition('unknown')).toBeUndefined();
    expect(service.has('unknown')).toBe(false);
  });

  it('infers z.infer<TSchema> as the payload type for render', () => {
    const service = new ConversationEventsService();
    const schema = z.object({ count: z.number() });

    // If schema inference is broken, `event.data.count: number` produces a type error here.
    const def: ConversationEventUIDefinition<'test.counter', typeof schema> = {
      type: 'test.counter',
      payloadSchema: schema,
      render: (event) => {
        const _count: number = event.data.count;
        return React.createElement('span', null, _count);
      },
    };

    service.register(def);
    expect(service.has('test.counter')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Compile-time guard: ValidConversationEventType on the PUBLIC contract
//
// The service accepts any ConversationEventUIDefinition<TType> and relies on
// runtime validation. The compile-time guard lives on the public contract's
// `register` generic. These assertions use `declare` so they produce no runtime
// code; the @ts-expect-error directives fail CI if the guard is ever removed.
// ---------------------------------------------------------------------------

declare const register: ConversationEventsServiceStartContract['register'];

// Dead code — TypeScript still checks the types; Jest never executes it.
if (false) {
  // @ts-expect-error — built-in timeline types are rejected at compile time
  register({ type: 'user_message', payloadSchema: z.object({}), render: () => null });

  // @ts-expect-error — types containing "::" are rejected at compile time
  register({ type: 'a::b', payloadSchema: z.object({}), render: () => null });
}

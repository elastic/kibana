/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ConversationEventUIDefinition,
  ConversationEventsServiceStartContract,
} from '@kbn/agent-builder-browser';
import { BUILT_IN_CONVERSATION_EVENT_TYPES } from '@kbn/agent-builder-common';
import { ConversationEventsService } from './conversation_events_service';

const noteDefinition: ConversationEventUIDefinition = {
  type: 'scratch.note',
  render: () => null,
};

const alertDefinition: ConversationEventUIDefinition = {
  type: 'security.alert_triaged',
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
    expect(() => service.register({ type: 'bad::type', render: () => null })).toThrow(
      'must not contain "::"'
    );
  });

  it('throws when a type is the reserved word "execution"', () => {
    const service = new ConversationEventsService();
    expect(() => service.register({ type: 'execution', render: () => null })).toThrow('reserved');
  });

  it('throws when a type is the reserved word "step"', () => {
    const service = new ConversationEventsService();
    expect(() => service.register({ type: 'step', render: () => null })).toThrow('reserved');
  });

  it('throws for every built-in timeline event type', () => {
    const service = new ConversationEventsService();
    for (const builtInType of BUILT_IN_CONVERSATION_EVENT_TYPES) {
      expect(() => service.register({ type: builtInType, render: () => null })).toThrow(
        'built-in timeline event type'
      );
    }
  });

  it('returns undefined / false for an unknown type', () => {
    const service = new ConversationEventsService();
    expect(service.getUiDefinition('unknown')).toBeUndefined();
    expect(service.has('unknown')).toBe(false);
  });

  it('types event.data in render from the TData parameter', () => {
    const service = new ConversationEventsService();

    // If TData stops reaching render, `event.data.count: number` is a type error here.
    const def: ConversationEventUIDefinition<'test.counter', { count: number }> = {
      type: 'test.counter',
      render: (event) => {
        const _count: number = event.data.count;
        return React.createElement('span', null, _count);
      },
    };

    service.register(def);
    expect(service.has('test.counter')).toBe(true);
  });
});

// The service relies on runtime validation; the compile-time guard lives on the public contract's
// `register` generic. The calls sit in functions that are never invoked, so TypeScript checks them
// without running them; the @ts-expect-error directives fail CI if the guard is removed.
describe('ConversationEventsServiceStartContract register', () => {
  it('rejects invalid type names at compile time', () => {
    const register: ConversationEventsServiceStartContract['register'] = jest.fn();
    const rejectedAtCompileTime = [
      // @ts-expect-error — built-in timeline types are rejected at compile time
      () => register({ type: 'user_message', render: () => null }),
      // @ts-expect-error — types containing "::" are rejected at compile time
      () => register({ type: 'a::b', render: () => null }),
    ];

    expect(rejectedAtCompileTime).toHaveLength(2);
    expect(register).not.toHaveBeenCalled();
  });
});

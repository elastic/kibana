/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server/conversation_events';
import type { ValidConversationEventType } from '@kbn/agent-builder-common';
import { createConversationEventTypeRegistry } from './conversation_event_type_registry';

const alertDefinition: ConversationEventTypeDefinition = {
  type: 'security.alert_triaged',
  payloadSchema: z.object({ alert_id: z.string() }),
};

describe('createConversationEventTypeRegistry', () => {
  it('registers a definition and returns it via get', () => {
    const registry = createConversationEventTypeRegistry();
    registry.register(alertDefinition);

    expect(registry.get('security.alert_triaged')).toBe(alertDefinition);
  });

  it('reports registration via has', () => {
    const registry = createConversationEventTypeRegistry();
    expect(registry.has('security.alert_triaged')).toBe(false);

    registry.register(alertDefinition);
    expect(registry.has('security.alert_triaged')).toBe(true);
  });

  it('throws when registering a duplicate type', () => {
    const registry = createConversationEventTypeRegistry();
    registry.register(alertDefinition);

    expect(() => registry.register(alertDefinition)).toThrow(
      'Conversation event type "security.alert_triaged" already registered'
    );
  });

  it('returns undefined for an unknown type', () => {
    const registry = createConversationEventTypeRegistry();
    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.has('unknown')).toBe(false);
  });

  it('lists all registered definitions in insertion order', () => {
    const registry = createConversationEventTypeRegistry();
    const second: ConversationEventTypeDefinition = {
      type: 'observability.slo_breached',
      payloadSchema: z.object({ slo_id: z.string() }),
    };

    expect(registry.list()).toEqual([]);

    registry.register(alertDefinition);
    registry.register(second);

    expect(registry.list()).toEqual([alertDefinition, second]);
  });

  it('throws when a type contains the id delimiter "::"', () => {
    const registry = createConversationEventTypeRegistry();
    expect(() => registry.register({ type: 'bad::type', payloadSchema: z.object({}) })).toThrow(
      'must not contain "::"'
    );
  });

  it('throws when a type is the reserved word "execution"', () => {
    const registry = createConversationEventTypeRegistry();
    expect(() => registry.register({ type: 'execution', payloadSchema: z.object({}) })).toThrow(
      'reserved'
    );
  });

  it('throws when a type is the reserved word "step"', () => {
    const registry = createConversationEventTypeRegistry();
    expect(() => registry.register({ type: 'step', payloadSchema: z.object({}) })).toThrow(
      'reserved'
    );
  });

  describe('ValidConversationEventType compile-time guard', () => {
    it('accepts a safe literal type', () => {
      // ValidConversationEventType<'security.alert_triaged'> must resolve to the literal itself
      type Safe = ValidConversationEventType<'security.alert_triaged'>;
      const _check: Safe = 'security.alert_triaged';
      expect(_check).toBe('security.alert_triaged');
    });

    it('rejects a type containing the delimiter at compile time', () => {
      // @ts-expect-error — ValidConversationEventType<'bad::type'> resolves to never
      const _bad: ValidConversationEventType<'bad::type'> = 'bad::type';
      expect(_bad).toBe('bad::type'); // runtime still runs, but TS errors
    });

    it('rejects the reserved word "execution" at compile time', () => {
      // @ts-expect-error — ValidConversationEventType<'execution'> resolves to never
      const _bad: ValidConversationEventType<'execution'> = 'execution';
      expect(_bad).toBe('execution');
    });
  });
});

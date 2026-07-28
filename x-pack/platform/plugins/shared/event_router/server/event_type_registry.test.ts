/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { EventTypeRegistry } from './event_type_registry';
import { InvalidEventError } from './errors';

describe('EventTypeRegistry', () => {
  let registry: EventTypeRegistry;

  beforeEach(() => {
    registry = new EventTypeRegistry();
  });

  describe('register', () => {
    it('registers a type', () => {
      registry.register({ type: 'a.b' });

      expect(registry.has('a.b')).toBe(true);
      expect(registry.getTypes()).toEqual(['a.b']);
    });

    it('rejects a duplicate type', () => {
      registry.register({ type: 'a.b' });

      expect(() => registry.register({ type: 'a.b' })).toThrowErrorMatchingInlineSnapshot(
        `"Event type \\"a.b\\" is already registered"`
      );
    });

    it('rejects an empty type', () => {
      expect(() => registry.register({ type: '  ' })).toThrowErrorMatchingInlineSnapshot(
        `"Event type must be a non-empty string"`
      );
    });
  });

  describe('validate', () => {
    it('rejects an unknown type', () => {
      expect(() => registry.validate('nope', {})).toThrow(InvalidEventError);
      expect(() => registry.validate('nope', {})).toThrowErrorMatchingInlineSnapshot(
        `"Unknown event type \\"nope\\""`
      );
    });

    it('accepts any payload when the type has no schema', () => {
      registry.register({ type: 'a.b' });

      expect(() => registry.validate('a.b', { anything: true })).not.toThrow();
      expect(() => registry.validate('a.b', undefined)).not.toThrow();
    });

    it('accepts a payload that satisfies the schema', () => {
      registry.register({
        type: 'a.b',
        payloadSchema: schema.object({ count: schema.number() }),
      });

      expect(() => registry.validate('a.b', { count: 1 })).not.toThrow();
    });

    it('rejects a payload that violates the schema', () => {
      registry.register({
        type: 'a.b',
        payloadSchema: schema.object({ count: schema.number() }),
      });

      expect(() => registry.validate('a.b', { count: 'one' })).toThrow(InvalidEventError);
      expect(() => registry.validate('a.b', { count: 'one' })).toThrow(
        /Invalid payload for event type "a.b"/
      );
    });

    it('validates a missing payload as an empty object', () => {
      registry.register({
        type: 'a.b',
        payloadSchema: schema.object({ count: schema.number() }),
      });

      expect(() => registry.validate('a.b', undefined)).toThrow(InvalidEventError);
    });
  });
});

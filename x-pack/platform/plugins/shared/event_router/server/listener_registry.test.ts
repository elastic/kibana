/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListenerRegistry } from './listener_registry';
import type { ListenerDefinition, ListenerFilter, RouterEvent } from './types';

const createEvent = (overrides: Partial<RouterEvent> = {}): RouterEvent => ({
  id: 'event-1',
  type: 'a.b',
  attributes: {},
  payload: {},
  receivedAt: '2026-07-28T00:00:00.000Z',
  spaceId: 'default',
  ...overrides,
});

const createListener = (id: string, filter: ListenerFilter): ListenerDefinition => ({
  id,
  filter,
  handler: jest.fn(),
});

describe('ListenerRegistry', () => {
  let registry: ListenerRegistry;

  beforeEach(() => {
    registry = new ListenerRegistry();
  });

  describe('register', () => {
    it('rejects a duplicate listener id', () => {
      registry.register(createListener('one', { types: ['a.b'] }));

      expect(() =>
        registry.register(createListener('one', { types: ['c.d'] }))
      ).toThrowErrorMatchingInlineSnapshot(`"Listener \\"one\\" is already registered"`);
    });

    it('rejects a listener that subscribes to nothing', () => {
      expect(() =>
        registry.register(createListener('one', { types: [] }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"Listener \\"one\\" must subscribe to at least one event type"`
      );
    });

    it('reports registered ids and subscribed types', () => {
      registry.register(createListener('one', { types: ['a.b', 'c.d'] }));
      registry.register(createListener('two', { types: ['a.b'] }));

      expect(registry.getIds()).toEqual(['one', 'two']);
      expect(registry.getSubscribedTypes()).toEqual(['a.b', 'c.d']);
    });
  });

  describe('match', () => {
    it('returns every listener subscribed to the event type', () => {
      const one = createListener('one', { types: ['a.b'] });
      const two = createListener('two', { types: ['a.b', 'c.d'] });
      registry.register(one);
      registry.register(two);

      expect(registry.match(createEvent())).toEqual([one, two]);
    });

    it('returns nothing when no listener subscribes to the type', () => {
      registry.register(createListener('one', { types: ['c.d'] }));

      expect(registry.match(createEvent())).toEqual([]);
    });

    it('returns a listener once even when it subscribes to the type twice', () => {
      const one = createListener('one', { types: ['a.b', 'a.b'] });
      registry.register(one);

      expect(registry.match(createEvent())).toEqual([one]);
    });

    it('applies attribute filters', () => {
      const scoped = createListener('scoped', {
        types: ['a.b'],
        attributes: { repo: 'elastic/kibana' },
      });
      const broad = createListener('broad', { types: ['a.b'] });
      registry.register(scoped);
      registry.register(broad);

      expect(registry.match(createEvent({ attributes: { repo: 'elastic/kibana' } }))).toEqual([
        scoped,
        broad,
      ]);
      expect(registry.match(createEvent({ attributes: { repo: 'elastic/eui' } }))).toEqual([broad]);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SubscriptionRegistry } from './subscription_registry';
import type { BusEvent } from './types';

const logger = {
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
} as unknown as Logger;

const event = (type: string): BusEvent => ({
  id: `id-${type}`,
  type,
  target: 'all',
  source: 'node-a',
  payload: {},
  timestamp: new Date().toISOString(),
});

describe('SubscriptionRegistry', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('ephemeral', () => {
    it('reports the union of subscribed types for the shared tail filter', () => {
      const registry = new SubscriptionRegistry();
      registry.addEphemeral(['a', 'b'], jest.fn());
      registry.addEphemeral(['b', 'c'], jest.fn());
      expect(registry.hasEphemeral()).toBe(true);
      expect(registry.ephemeralTypes().sort()).toEqual(['a', 'b', 'c']);
    });

    it('dispatches only to handlers subscribed to the event type', async () => {
      const registry = new SubscriptionRegistry();
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      registry.addEphemeral(['a'], handlerA);
      registry.addEphemeral(['b'], handlerB);

      await registry.dispatchEphemeral(event('a'), logger);

      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).not.toHaveBeenCalled();
    });

    it('isolates handler failures: a throwing handler is logged and siblings still run', async () => {
      const registry = new SubscriptionRegistry();
      const throwing = jest.fn().mockRejectedValue(new Error('boom'));
      const healthy = jest.fn();
      registry.addEphemeral(['a'], throwing);
      registry.addEphemeral(['a'], healthy);

      await expect(registry.dispatchEphemeral(event('a'), logger)).resolves.toBeUndefined();

      expect(throwing).toHaveBeenCalledTimes(1);
      expect(healthy).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('stops dispatching to a removed subscription', async () => {
      const registry = new SubscriptionRegistry();
      const handler = jest.fn();
      const id = registry.addEphemeral(['a'], handler);
      registry.removeEphemeral(id);

      expect(registry.hasEphemeral()).toBe(false);
      await registry.dispatchEphemeral(event('a'), logger);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('durable', () => {
    it('registers, resolves, and unregisters a durable consumer handler', () => {
      const registry = new SubscriptionRegistry();
      const handler = jest.fn();
      registry.registerDurable('my-consumer', ['a'], handler);

      const sub = registry.getDurable('my-consumer');
      expect(sub).toMatchObject({ consumer: 'my-consumer', types: ['a'] });

      registry.unregisterDurable('my-consumer');
      expect(registry.getDurable('my-consumer')).toBeUndefined();
    });
  });
});

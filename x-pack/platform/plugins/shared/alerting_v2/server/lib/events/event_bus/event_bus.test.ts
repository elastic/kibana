/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { LoggerService } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { AlertingDomainEventBus } from './event_bus';
import type { DomainEvent } from './types';

interface FooEvent extends DomainEvent {
  readonly type: 'foo';
  readonly payload: string;
}

interface BarEvent extends DomainEvent {
  readonly type: 'bar';
  readonly count: number;
}

type TestEvent = FooEvent | BarEvent;

const fooEvent = (payload = 'hello'): FooEvent => ({ type: 'foo', payload });
const barEvent = (count = 1): BarEvent => ({ type: 'bar', count });

/**
 * Yields to the event loop long enough for queued microtasks and one round
 * of `setImmediate` work to settle. Two `setImmediate` flushes are awaited
 * so handlers that internally await one macrotask (e.g. `setImmediate`)
 * still complete before the caller continues.
 *
 * Local to this file for now; lift into a shared test util once a second
 * consumer needs it.
 */
const flushAsync = async (): Promise<void> => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

describe('AlertingDomainEventBus', () => {
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let bus: AlertingDomainEventBus<TestEvent>;

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    bus = new AlertingDomainEventBus<TestEvent>(loggerService);
  });

  describe('publish / subscribe', () => {
    const reservedTypes = ['error', 'newListener', 'removeListener'] as const;

    it('invokes the subscribed handler when a matching event is published', async () => {
      const handler = jest.fn();
      bus.subscribe<FooEvent>('foo', handler);

      const event = fooEvent('world');
      bus.publish(event);

      await flushAsync();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('dispatches handlers asynchronously so publish() returns before handlers run', async () => {
      let handlerRan = false;
      bus.subscribe<FooEvent>('foo', () => {
        handlerRan = true;
      });

      bus.publish(fooEvent());

      expect(handlerRan).toBe(false);

      await flushAsync();

      expect(handlerRan).toBe(true);
    });

    it('does not invoke handlers subscribed to a different event type', async () => {
      const fooHandler = jest.fn();
      const barHandler = jest.fn();
      bus.subscribe<FooEvent>('foo', fooHandler);
      bus.subscribe<BarEvent>('bar', barHandler);

      bus.publish(fooEvent());

      await flushAsync();

      expect(fooHandler).toHaveBeenCalledTimes(1);
      expect(barHandler).not.toHaveBeenCalled();
    });

    it('invokes every handler subscribed to the same event type', async () => {
      const handlers = [jest.fn(), jest.fn(), jest.fn()];
      handlers.forEach((handler) => bus.subscribe<FooEvent>('foo', handler));

      const event = fooEvent();
      bus.publish(event);

      await flushAsync();

      handlers.forEach((handler) => {
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(event);
      });
    });

    it('awaits async handlers without surfacing errors to the publisher', async () => {
      const handler = jest.fn(async (_event: FooEvent) => {
        await new Promise((resolve) => setImmediate(resolve));
      });
      bus.subscribe<FooEvent>('foo', handler);

      bus.publish(fooEvent());

      await flushAsync();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('routes each event only to handlers of its own type even with multiple types in flight', async () => {
      const fooHandler = jest.fn();
      const barHandler = jest.fn();
      bus.subscribe<FooEvent>('foo', fooHandler);
      bus.subscribe<BarEvent>('bar', barHandler);

      const foo = fooEvent('one');
      const bar = barEvent(7);
      bus.publish(foo);
      bus.publish(bar);

      await flushAsync();

      expect(fooHandler).toHaveBeenCalledTimes(1);
      expect(fooHandler).toHaveBeenCalledWith(foo);
      expect(barHandler).toHaveBeenCalledTimes(1);
      expect(barHandler).toHaveBeenCalledWith(bar);
    });

    it.each(reservedTypes)(
      'refuses to publish events typed "%s", logs a single warn, and does not dispatch to handlers',
      async (reservedType) => {
        const handler = jest.fn();
        bus.subscribe(reservedType, handler);
        // @ts-expect-error: we're testing the reserved type
        bus.publish({ type: reservedType });

        await flushAsync();

        expect(handler).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      }
    );
  });

  describe('error isolation', () => {
    it('continues invoking siblings when a handler throws synchronously', async () => {
      const failing = jest.fn(() => {
        throw new Error('boom');
      });
      const succeeding = jest.fn();
      bus.subscribe<FooEvent>('foo', failing);
      bus.subscribe<FooEvent>('foo', succeeding);

      bus.publish(fooEvent());

      await flushAsync();

      expect(failing).toHaveBeenCalledTimes(1);
      expect(succeeding).toHaveBeenCalledTimes(1);
    });

    it('continues invoking siblings when a handler returns a rejected promise', async () => {
      const failing = jest.fn().mockRejectedValue(new Error('boom async'));
      const succeeding = jest.fn();
      bus.subscribe<FooEvent>('foo', failing);
      bus.subscribe<FooEvent>('foo', succeeding);

      bus.publish(fooEvent());

      await flushAsync();

      expect(failing).toHaveBeenCalledTimes(1);
      expect(succeeding).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('stops invoking the handler after unsubscribe()', async () => {
      const handler = jest.fn();
      const subscription = bus.subscribe<FooEvent>('foo', handler);

      bus.publish(fooEvent());
      await flushAsync();
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      bus.publish(fooEvent());
      await flushAsync();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not affect sibling handlers when one is unsubscribed', async () => {
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      const subscriptionA = bus.subscribe<FooEvent>('foo', handlerA);
      bus.subscribe<FooEvent>('foo', handlerB);

      subscriptionA.unsubscribe();
      bus.publish(fooEvent());

      await flushAsync();

      expect(handlerA).not.toHaveBeenCalled();
      expect(handlerB).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: calling unsubscribe() more than once is a no-op', async () => {
      const handler = jest.fn();
      const subscription = bus.subscribe<FooEvent>('foo', handler);

      subscription.unsubscribe();
      subscription.unsubscribe();
      subscription.unsubscribe();

      bus.publish(fooEvent());
      await flushAsync();

      expect(handler).not.toHaveBeenCalled();
    });

    it('treats the same handler subscribed twice as two independent subscriptions', async () => {
      const handler = jest.fn();
      const subscription1 = bus.subscribe<FooEvent>('foo', handler);
      bus.subscribe<FooEvent>('foo', handler);

      bus.publish(fooEvent());
      await flushAsync();
      expect(handler).toHaveBeenCalledTimes(2);

      subscription1.unsubscribe();
      bus.publish(fooEvent());
      await flushAsync();

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('publish validation', () => {
    it('ignores null events without dispatching to any handler', async () => {
      const handler = jest.fn();
      bus.subscribe<FooEvent>('foo', handler);

      bus.publish(null as unknown as FooEvent);

      await flushAsync();

      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores undefined events', async () => {
      const handler = jest.fn();
      bus.subscribe<FooEvent>('foo', handler);

      bus.publish(undefined as unknown as FooEvent);

      await flushAsync();

      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores events whose `type` is not a string', async () => {
      const handler = jest.fn();
      bus.subscribe<FooEvent>('foo', handler);

      bus.publish({ type: 123 } as unknown as FooEvent);

      await flushAsync();

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

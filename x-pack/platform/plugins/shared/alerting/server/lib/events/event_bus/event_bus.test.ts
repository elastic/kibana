/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AsyncDomainEventBus } from './event_bus';
import type { DomainEvent } from './types';

interface TestEvent extends DomainEvent {
  readonly type: 'test.event';
  readonly data: string;
}

interface OtherEvent extends DomainEvent {
  readonly type: 'other.event';
  readonly value: number;
}

type BusEvent = TestEvent | OtherEvent;

const flushImmediate = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('AsyncDomainEventBus', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let bus: AsyncDomainEventBus<BusEvent>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    bus = new AsyncDomainEventBus(logger);
  });

  describe('publish guards', () => {
    it('ignores events without a string type', async () => {
      const handler = jest.fn();
      bus.subscribe('test.event', handler);

      // @ts-expect-error — intentionally passing a bad shape to test the guard
      bus.publish({ notAType: 'test.event', data: 'hi' });
      await flushImmediate();

      expect(handler).not.toHaveBeenCalled();
      expect(loggingSystemMock.collect(logger).debug).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.stringContaining('Refused to publish event without a string type'),
          ]),
        ])
      );
    });

    it.each(['error', 'newListener', 'removeListener'])(
      'rejects reserved type "%s"',
      async (reservedType) => {
        const handler = jest.fn();
        bus.subscribe('test.event', handler);

        bus.publish({ type: reservedType as 'test.event', data: 'hi' });
        await flushImmediate();

        expect(handler).not.toHaveBeenCalled();
        expect(loggingSystemMock.collect(logger).warn).toEqual(
          expect.arrayContaining([
            expect.arrayContaining([
              expect.stringContaining(`reserved type: ${reservedType}`),
            ]),
          ])
        );
      }
    );
  });

  describe('publish + subscribe', () => {
    it('delivers the event to a subscribed handler', async () => {
      const handler = jest.fn();
      bus.subscribe('test.event', handler);

      const event: TestEvent = { type: 'test.event', data: 'hello' };
      bus.publish(event);
      await flushImmediate();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('only delivers to handlers subscribed to that type', async () => {
      const testHandler = jest.fn();
      const otherHandler = jest.fn();
      bus.subscribe('test.event', testHandler);
      bus.subscribe('other.event', otherHandler);

      bus.publish({ type: 'test.event', data: 'hello' });
      await flushImmediate();

      expect(testHandler).toHaveBeenCalledTimes(1);
      expect(otherHandler).not.toHaveBeenCalled();
    });

    it('delivers to all handlers subscribed to the same type', async () => {
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      bus.subscribe('test.event', handlerA);
      bus.subscribe('test.event', handlerB);

      bus.publish({ type: 'test.event', data: 'hello' });
      await flushImmediate();

      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledTimes(1);
    });

    it('threads context from publisher to handler', async () => {
      const busWithCtx = new AsyncDomainEventBus<BusEvent, { traceId: string }>(logger);
      const handler = jest.fn();
      busWithCtx.subscribe('test.event', handler);

      const event: TestEvent = { type: 'test.event', data: 'ctx-test' };
      const ctx = { traceId: 'abc-123' };
      busWithCtx.publish(event, ctx);
      await flushImmediate();

      expect(handler).toHaveBeenCalledWith(event, ctx);
    });

    it('dispatches handlers asynchronously (next event-loop tick)', async () => {
      const calls: string[] = [];
      bus.subscribe('test.event', () => {
        calls.push('handler');
      });

      bus.publish({ type: 'test.event', data: 'async' });
      calls.push('after publish');

      // handler has not run yet
      expect(calls).toEqual(['after publish']);

      await flushImmediate();

      expect(calls).toEqual(['after publish', 'handler']);
    });
  });

  describe('handler isolation', () => {
    it('does not let one failing handler prevent others from running', async () => {
      const goodHandler = jest.fn();
      bus.subscribe('test.event', async () => {
        throw new Error('intentional failure');
      });
      bus.subscribe('test.event', goodHandler);

      bus.publish({ type: 'test.event', data: 'isolation' });
      await flushImmediate();

      expect(goodHandler).toHaveBeenCalledTimes(1);
      expect(loggingSystemMock.collect(logger).error).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringContaining('intentional failure')]),
        ])
      );
    });
  });

  describe('unsubscribe', () => {
    it('stops delivering events after unsubscribe', async () => {
      const handler = jest.fn();
      const { unsubscribe } = bus.subscribe('test.event', handler);

      bus.publish({ type: 'test.event', data: 'before' });
      await flushImmediate();
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      bus.publish({ type: 'test.event', data: 'after' });
      await flushImmediate();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('calling unsubscribe twice does not throw', async () => {
      const { unsubscribe } = bus.subscribe('test.event', jest.fn());
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});

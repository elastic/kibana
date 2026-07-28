/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { Dispatcher } from './dispatcher';
import { InvalidEventError } from './errors';
import { EventRouter } from './event_router';
import { EventTypeRegistry } from './event_type_registry';
import { ListenerRegistry } from './listener_registry';

describe('EventRouter', () => {
  const request = httpServerMock.createKibanaRequest();
  let handler: jest.Mock;
  let eventRouter: EventRouter;

  beforeEach(() => {
    const eventTypes = new EventTypeRegistry();
    eventTypes.register({
      type: 'a.b',
      payloadSchema: schema.object({ count: schema.number() }),
    });

    const listeners = new ListenerRegistry();
    handler = jest.fn();
    listeners.register({ id: 'one', filter: { types: ['a.b'] }, handler });

    eventRouter = new EventRouter({
      eventTypes,
      dispatcher: new Dispatcher({
        listeners,
        logger: loggerMock.create(),
        listenerTimeoutMs: 1000,
      }),
    });
  });

  describe('publish', () => {
    it('rejects an unknown event type without dispatching', async () => {
      await expect(eventRouter.publish({ type: 'nope' }, request)).rejects.toThrow(
        InvalidEventError
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it('rejects a payload that violates the event type schema without dispatching', async () => {
      await expect(
        eventRouter.publish({ type: 'a.b', payload: { count: 'one' } }, request)
      ).rejects.toThrow(InvalidEventError);
      expect(handler).not.toHaveBeenCalled();
    });

    it('stamps the event and reports which listeners enqueued it', async () => {
      const result = await eventRouter.publish(
        { type: 'a.b', attributes: { repo: 'elastic/kibana' }, payload: { count: 1 } },
        request
      );

      expect(result).toEqual({
        id: expect.any(String),
        type: 'a.b',
        enqueued: ['one'],
        failures: [],
      });
      expect(handler).toHaveBeenCalledWith(
        {
          id: result.id,
          type: 'a.b',
          attributes: { repo: 'elastic/kibana' },
          payload: { count: 1 },
          receivedAt: expect.any(String),
          spaceId: request.spaceId,
        },
        { request }
      );
    });

    it('reports a listener failure rather than throwing', async () => {
      handler.mockRejectedValue(new Error('task manager unavailable'));

      const result = await eventRouter.publish({ type: 'a.b', payload: { count: 1 } }, request);

      expect(result.enqueued).toEqual([]);
      expect(result.failures).toEqual([{ listenerId: 'one', message: 'task manager unavailable' }]);
    });
  });

  describe('publishBatch', () => {
    it('validates the whole batch before delivering any of it', async () => {
      await expect(
        eventRouter.publishBatch(
          [{ type: 'a.b', payload: { count: 1 } }, { type: 'nope' }],
          request
        )
      ).rejects.toThrow(InvalidEventError);
      expect(handler).not.toHaveBeenCalled();
    });

    it('returns a result per event, each with its own id', async () => {
      const results = await eventRouter.publishBatch(
        [
          { type: 'a.b', payload: { count: 1 } },
          { type: 'a.b', payload: { count: 2 } },
        ],
        request
      );

      expect(results).toHaveLength(2);
      expect(results[0].id).not.toEqual(results[1].id);
      expect(results.every(({ enqueued }) => enqueued.includes('one'))).toBe(true);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});

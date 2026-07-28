/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type } from '@kbn/config-schema';
import type { RequestHandlerContext } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { Dispatcher } from '../dispatcher';
import { EventRouter } from '../event_router';
import { EventTypeRegistry } from '../event_type_registry';
import { ListenerRegistry } from '../listener_registry';
import { registerPublishEventsRoute } from './publish_events';

const MAX_EVENTS_PER_REQUEST = 3;

const context = {} as unknown as RequestHandlerContext;

describe('POST /api/event_router/events', () => {
  let handler: jest.Mock;

  const setup = () => {
    const eventTypes = new EventTypeRegistry();
    eventTypes.register({
      type: 'a.b',
      payloadSchema: schema.object({ count: schema.number() }),
    });

    const listeners = new ListenerRegistry();
    handler = jest.fn();
    listeners.register({ id: 'one', filter: { types: ['a.b'] }, handler });

    const router = httpServiceMock.createSetupContract().createRouter();

    registerPublishEventsRoute({
      router,
      eventRouter: new EventRouter({
        eventTypes,
        dispatcher: new Dispatcher({
          listeners,
          logger: loggerMock.create(),
          listenerTimeoutMs: 1000,
        }),
      }),
      maxEventsPerRequest: MAX_EVENTS_PER_REQUEST,
    });

    const [routeDefinition, routeHandler] =
      router.versioned.post.mock.results[0].value.addVersion.mock.calls[0];

    return { routeDefinition, routeHandler };
  };

  const bodySchemaOf = (routeDefinition: { validate: unknown }): Type<unknown> =>
    (routeDefinition.validate as { request: { body: Type<unknown> } }).request.body;

  it('accepts the events and reports which listeners enqueued them', async () => {
    const { routeHandler } = setup();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      body: {
        events: [{ type: 'a.b', attributes: { repo: 'elastic/kibana' }, payload: { count: 1 } }],
      },
    });

    const response = await routeHandler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [{ id: expect.any(String), type: 'a.b', enqueued: ['one'], failures: [] }],
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown event type without delivering any of the batch', async () => {
    const { routeHandler } = setup();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      body: { events: [{ type: 'a.b', payload: { count: 1 } }, { type: 'nope' }] },
    });

    const response = await routeHandler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({ message: 'Unknown event type "nope"' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('asks the producer to retry when a listener does not accept the event', async () => {
    const { routeHandler } = setup();
    handler.mockRejectedValue(new Error('task manager unavailable'));
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      body: { events: [{ type: 'a.b', payload: { count: 1 } }] },
    });

    const response = await routeHandler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({
      message:
        '1 of 1 event(s) were not accepted by every listener. Retry the request; listeners that already accepted an event will see it again.',
      attributes: {
        results: [
          {
            id: expect.any(String),
            type: 'a.b',
            enqueued: [],
            failures: [{ listenerId: 'one', message: 'task manager unavailable' }],
          },
        ],
      },
    });
  });

  it('caps how many events a single request may carry', () => {
    const { routeDefinition } = setup();
    const bodySchema = bodySchemaOf(routeDefinition);
    const event = { type: 'a.b', payload: { count: 1 } };

    expect(() =>
      bodySchema.validate({ events: new Array(MAX_EVENTS_PER_REQUEST).fill(event) })
    ).not.toThrow();
    expect(() =>
      bodySchema.validate({ events: new Array(MAX_EVENTS_PER_REQUEST + 1).fill(event) })
    ).toThrow('[events]: array size is [4], but cannot be greater than [3]');
    expect(() => bodySchema.validate({ events: [] })).toThrow(
      '[events]: array size is [0], but cannot be smaller than [1]'
    );
  });
});

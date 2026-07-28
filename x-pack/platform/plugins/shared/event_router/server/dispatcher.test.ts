/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { Dispatcher } from './dispatcher';
import { ListenerRegistry } from './listener_registry';
import type { RouterEvent } from './types';

const LISTENER_TIMEOUT_MS = 50;

const event: RouterEvent = {
  id: 'event-1',
  type: 'a.b',
  attributes: { repo: 'elastic/kibana' },
  payload: { count: 1 },
  receivedAt: '2026-07-28T00:00:00.000Z',
  spaceId: 'default',
};

describe('Dispatcher', () => {
  const request = httpServerMock.createKibanaRequest();
  let listeners: ListenerRegistry;
  let logger: ReturnType<typeof loggerMock.create>;
  let dispatcher: Dispatcher;

  beforeEach(() => {
    listeners = new ListenerRegistry();
    logger = loggerMock.create();
    dispatcher = new Dispatcher({ listeners, logger, listenerTimeoutMs: LISTENER_TIMEOUT_MS });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing when no listener matches', async () => {
    const handler = jest.fn();
    listeners.register({ id: 'other', filter: { types: ['c.d'] }, handler });

    await expect(dispatcher.dispatch(event, request)).resolves.toEqual({
      enqueued: [],
      failures: [],
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('hands the event and the publishing request to every matching listener', async () => {
    const one = jest.fn();
    const two = jest.fn();
    listeners.register({ id: 'one', filter: { types: ['a.b'] }, handler: one });
    listeners.register({
      id: 'two',
      filter: { types: ['a.b'], attributes: { repo: 'elastic/kibana' } },
      handler: two,
    });

    await expect(dispatcher.dispatch(event, request)).resolves.toEqual({
      enqueued: ['one', 'two'],
      failures: [],
    });
    expect(one).toHaveBeenCalledWith(event, { request });
    expect(two).toHaveBeenCalledWith(event, { request });
  });

  it('isolates a failing listener from the others', async () => {
    listeners.register({
      id: 'bad',
      filter: { types: ['a.b'] },
      handler: jest.fn().mockRejectedValue(new Error('task manager unavailable')),
    });
    const good = jest.fn();
    listeners.register({ id: 'good', filter: { types: ['a.b'] }, handler: good });

    await expect(dispatcher.dispatch(event, request)).resolves.toEqual({
      enqueued: ['good'],
      failures: [{ listenerId: 'bad', message: 'task manager unavailable' }],
    });
    expect(good).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Listener "bad" failed to enqueue work for event event-1 of type "a.b": task manager unavailable'
    );
  });

  it('fails a listener that does not enqueue its work in time', async () => {
    jest.useFakeTimers();
    listeners.register({
      id: 'slow',
      filter: { types: ['a.b'] },
      handler: () => new Promise<void>(() => {}),
    });

    const dispatched = dispatcher.dispatch(event, request);
    await jest.advanceTimersByTimeAsync(LISTENER_TIMEOUT_MS);

    await expect(dispatched).resolves.toEqual({
      enqueued: [],
      failures: [
        {
          listenerId: 'slow',
          message: `Listener "slow" did not enqueue its work within ${LISTENER_TIMEOUT_MS}ms`,
        },
      ],
    });
  });
});

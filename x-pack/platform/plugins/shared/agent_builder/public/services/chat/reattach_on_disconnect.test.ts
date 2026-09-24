/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat, EMPTY, lastValueFrom, Observable, of, switchAll, throwError, toArray } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  AgentBuilderErrorCode,
  ChatEventType,
  TimelineEventType,
  createAgentBuilderError,
} from '@kbn/agent-builder-common';
import { isDisconnectError, streamWithReattach } from './reattach_on_disconnect';

const chunk = (text: string) =>
  ({ type: ChatEventType.messageChunk, data: { text_chunk: text } } as ChatEvent);

const terminated = { type: TimelineEventType.executionTerminated, data: {} } as ChatEvent;
const conversationUpdated = { type: ChatEventType.conversationUpdated, data: {} } as ChatEvent;
const conversationCreated = { type: ChatEventType.conversationCreated, data: {} } as ChatEvent;

/** A stand-in for core's `HttpFetchError`: `isHttpFetchError` keys off the `request` property. */
const httpFetchError = (status?: number) =>
  Object.assign(new Error(status ? `status ${status}` : 'Failed to fetch'), {
    request: {},
    ...(status ? { response: { status } } : {}),
  });

describe('isDisconnectError', () => {
  it('treats network and stream errors as disconnects', () => {
    expect(isDisconnectError(new TypeError('network error'))).toBe(true);
    expect(isDisconnectError(httpFetchError())).toBe(true);
  });

  it('treats gateway errors as disconnects', () => {
    expect(isDisconnectError(httpFetchError(502))).toBe(true);
    expect(isDisconnectError(httpFetchError(503))).toBe(true);
    expect(isDisconnectError(httpFetchError(504))).toBe(true);
  });

  it('does not treat errors coming from Kibana or aborts as disconnects', () => {
    expect(
      isDisconnectError(createAgentBuilderError(AgentBuilderErrorCode.internalError, 'boom'))
    ).toBe(false);
    expect(isDisconnectError(httpFetchError(400))).toBe(false);
    expect(isDisconnectError(httpFetchError(500))).toBe(false);
    expect(isDisconnectError(Object.assign(new Error('aborted'), { name: 'AbortError' }))).toBe(
      false
    );
  });
});

describe('streamWithReattach', () => {
  it('reattaches after a network error, resuming after the events already received', async () => {
    const reattach = jest.fn(async (_offset: number) =>
      of(chunk('c'), terminated, conversationUpdated)
    );

    const received = await lastValueFrom(
      streamWithReattach({
        connect: async () =>
          concat(
            of(chunk('a'), chunk('b')),
            throwError(() => new TypeError('network error'))
          ),
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach).toHaveBeenCalledTimes(1);
    expect(reattach).toHaveBeenCalledWith(2);
    expect(received).toEqual([chunk('a'), chunk('b'), chunk('c'), terminated, conversationUpdated]);
  });

  it('reattaches after a gateway timeout on the initial request', async () => {
    const reattach = jest.fn(async (_offset: number) => of(terminated, conversationUpdated));

    const received = await lastValueFrom(
      streamWithReattach({
        connect: () => Promise.reject(httpFetchError(504)),
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach).toHaveBeenCalledWith(0);
    expect(received).toEqual([terminated, conversationUpdated]);
  });

  it('does not reattach after an error sent by Kibana', async () => {
    const error = createAgentBuilderError(AgentBuilderErrorCode.internalError, 'boom');
    const reattach = jest.fn(async (_offset: number) => of(conversationUpdated));

    await expect(
      lastValueFrom(
        streamWithReattach({
          connect: async () =>
            concat(
              of(chunk('a')),
              throwError(() => error)
            ),
          reattach,
          parse: switchAll(),
        })
      )
    ).rejects.toBe(error);
    expect(reattach).not.toHaveBeenCalled();
  });

  it('does not reattach after an HTTP error answered by Kibana', async () => {
    const error = httpFetchError(400);
    const reattach = jest.fn(async (_offset: number) => of(conversationUpdated));

    await expect(
      lastValueFrom(
        streamWithReattach({
          connect: () => Promise.reject(error),
          reattach,
          parse: switchAll(),
        })
      )
    ).rejects.toBe(error);
    expect(reattach).not.toHaveBeenCalled();
  });

  it('does not reattach once the caller aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = new TypeError('network error');
    const reattach = jest.fn(async (_offset: number) => of(conversationUpdated));

    await expect(
      lastValueFrom(
        streamWithReattach({
          connect: async () => throwError(() => error),
          reattach,
          parse: switchAll(),
          signal: controller.signal,
        })
      )
    ).rejects.toBe(error);
    expect(reattach).not.toHaveBeenCalled();
  });

  it('surfaces the error without another attempt when the reattach cannot connect', async () => {
    const error = httpFetchError();
    const reattach = jest.fn((_offset: number) => Promise.reject(error));

    await expect(
      lastValueFrom(
        streamWithReattach({
          connect: async () =>
            concat(
              of(chunk('a')),
              throwError(() => new TypeError('network error'))
            ),
          reattach,
          parse: switchAll(),
        })
      )
    ).rejects.toBe(error);
    expect(reattach).toHaveBeenCalledTimes(1);
  });

  it('reattaches again after a reattach that connected is cut as well', async () => {
    const reattach = jest
      .fn<Promise<Observable<ChatEvent>>, [number]>()
      .mockImplementationOnce(async () =>
        concat(
          of(chunk('b')),
          throwError(() => new TypeError('network error'))
        )
      )
      .mockImplementationOnce(async () => throwError(() => new TypeError('network error')))
      .mockImplementationOnce(async () => of(terminated, conversationUpdated));

    const received = await lastValueFrom(
      streamWithReattach({
        connect: async () =>
          concat(
            of(chunk('a')),
            throwError(() => new TypeError('network error'))
          ),
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach.mock.calls).toEqual([[1], [2], [2]]);
    expect(received).toEqual([chunk('a'), chunk('b'), terminated, conversationUpdated]);
  });

  it('reattaches after a network error following the terminal event', async () => {
    const reattach = jest.fn(async (_offset: number) => of(conversationUpdated));

    const received = await lastValueFrom(
      streamWithReattach({
        connect: async () =>
          concat(
            of(chunk('a'), terminated),
            throwError(() => new TypeError('network error'))
          ),
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach).toHaveBeenCalledWith(2);
    expect(received).toEqual([chunk('a'), terminated, conversationUpdated]);
  });

  it('reattaches when the stream closes between the terminal and the conversation event', async () => {
    const reattach = jest.fn(async (_offset: number) => of(conversationUpdated));

    const received = await lastValueFrom(
      streamWithReattach({
        connect: async () => of(chunk('a'), terminated),
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach).toHaveBeenCalledWith(2);
    expect(received).toEqual([chunk('a'), terminated, conversationUpdated]);
  });

  it('reattaches when the stream closes before the end of the execution', async () => {
    const reattach = jest.fn(async (_offset: number) => of(terminated, conversationUpdated));

    const received = await lastValueFrom(
      streamWithReattach({
        connect: async () => of(chunk('a')),
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach).toHaveBeenCalledWith(1);
    expect(received).toEqual([chunk('a'), terminated, conversationUpdated]);
  });

  it('reattaches when the initial response closes before its first event', async () => {
    const reattach = jest.fn(async (_offset: number) => of(chunk('a'), conversationCreated));

    const received = await lastValueFrom(
      streamWithReattach({
        connect: async () => EMPTY,
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach).toHaveBeenCalledWith(0);
    expect(received).toEqual([chunk('a'), conversationCreated]);
  });

  it('reattaches again when a reattach closes before delivering any event', async () => {
    const reattach = jest
      .fn<Promise<Observable<ChatEvent>>, [number]>()
      .mockImplementationOnce(async () => EMPTY)
      .mockImplementationOnce(async () => of(chunk('b'), conversationUpdated));

    const received = await lastValueFrom(
      streamWithReattach({
        connect: async () => of(chunk('a')),
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach.mock.calls).toEqual([[1], [1]]);
    expect(received).toEqual([chunk('a'), chunk('b'), conversationUpdated]);
  });

  it('does not reattach once the conversation event was received', async () => {
    const reattach = jest.fn(async (_offset: number) => of(conversationUpdated));

    const received = await lastValueFrom(
      streamWithReattach({
        connect: async () => of(chunk('a'), terminated, conversationUpdated),
        reattach,
        parse: switchAll(),
      }).pipe(toArray())
    );

    expect(reattach).not.toHaveBeenCalled();
    expect(received).toEqual([chunk('a'), terminated, conversationUpdated]);
  });

  it('surfaces the original error when the execution to reattach to does not exist', async () => {
    const error = httpFetchError(504);
    const reattach = jest.fn((_offset: number) => Promise.reject(httpFetchError(404)));

    await expect(
      lastValueFrom(
        streamWithReattach({
          connect: () => Promise.reject(error),
          reattach,
          parse: switchAll(),
        })
      )
    ).rejects.toBe(error);
    expect(reattach).toHaveBeenCalledTimes(1);
  });

  it('surfaces the not found error when the reattach followed a closed stream', async () => {
    const error = httpFetchError(404);
    const reattach = jest.fn((_offset: number) => Promise.reject(error));

    await expect(
      lastValueFrom(
        streamWithReattach({
          connect: async () => EMPTY,
          reattach,
          parse: switchAll(),
        })
      )
    ).rejects.toBe(error);
  });

  it('closes the reattached connection on unsubscribe', async () => {
    let reattachedConnectionClosed = false;
    const reattach = jest.fn(
      async (_offset: number) =>
        new Observable<ChatEvent>(() => () => {
          reattachedConnectionClosed = true;
        })
    );

    const subscription = streamWithReattach({
      connect: async () => throwError(() => new TypeError('network error')),
      reattach,
      parse: switchAll(),
    }).subscribe();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reattach).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();

    expect(reattachedConnectionClosed).toBe(true);
  });
});

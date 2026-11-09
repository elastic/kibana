/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat, lastValueFrom, of, switchMap, throwError, toArray } from 'rxjs';
import type { Observable } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import { internalApiPath } from '../../../common/constants';
import { EventsService } from '../events';
import { ChatService } from './chat_service';

interface FakeStreamedResponse {
  events$: Observable<ChatEvent>;
}

// The SSE parser needs a real `Response` body; replace it with one that reads the events the
// fake http response carries, so `streamWithReattach` runs for real.
jest.mock('@kbn/sse-utils-client', () => ({
  httpResponseIntoObservable: () => switchMap((response: FakeStreamedResponse) => response.events$),
}));

const chunk = (text: string): ChatEvent =>
  ({ type: ChatEventType.messageChunk, data: { message_id: 'm1', text_chunk: text } } as ChatEvent);
const conversationUpdated = { type: ChatEventType.conversationUpdated, data: {} } as ChatEvent;

/** A stand-in for core's `HttpFetchError` without a status: the connection was cut. */
const disconnectError = () => Object.assign(new Error('Failed to fetch'), { request: {} });

const streamOf = (events$: Observable<ChatEvent>): FakeStreamedResponse => ({ events$ });

const setup = () => {
  const http = { get: jest.fn(), post: jest.fn() } as unknown as jest.Mocked<HttpSetup>;
  const events = new EventsService();
  const service = new ChatService({ http, events });
  return { http, events, service };
};

const reattachPath = (executionId: string) =>
  `${internalApiPath}/executions/${executionId}/reattach`;

describe('ChatService.attachToExecution', () => {
  it('replays the execution from offset 0 without publishing to the events service', async () => {
    const { http, events, service } = setup();
    http.get.mockResolvedValueOnce(streamOf(of(chunk('a'), chunk('b'), conversationUpdated)));

    const published: ChatEvent[] = [];
    events.getChatEvents$('conv-1').subscribe((event) => published.push(event));

    const received = await lastValueFrom(
      service.attachToExecution({ conversationId: 'conv-1', executionId: 'exec-1' }).pipe(toArray())
    );

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith(
      reattachPath('exec-1'),
      expect.objectContaining({ query: { offset: 0 }, asResponse: true, rawResponse: true })
    );
    expect(received).toEqual([chunk('a'), chunk('b'), conversationUpdated]);
    // A replay would hand other plugins events they may already have acted on.
    expect(published).toEqual([]);
  });

  it('reconnects after a cut connection, skipping the events already received', async () => {
    const { http, service } = setup();
    http.get
      .mockResolvedValueOnce(
        streamOf(
          concat(
            of(chunk('a'), chunk('b')),
            throwError(() => disconnectError())
          )
        )
      )
      .mockResolvedValueOnce(streamOf(of(chunk('c'), conversationUpdated)));

    const received = await lastValueFrom(
      service.attachToExecution({ conversationId: 'conv-1', executionId: 'exec-1' }).pipe(toArray())
    );

    expect(http.get).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      reattachPath('exec-1'),
      expect.objectContaining({ query: { offset: 2 } })
    );
    expect(received).toEqual([chunk('a'), chunk('b'), chunk('c'), conversationUpdated]);
  });

  it('passes the abort signal to every request', async () => {
    const { http, service } = setup();
    const controller = new AbortController();
    http.get.mockResolvedValueOnce(streamOf(of(conversationUpdated)));

    await lastValueFrom(
      service.attachToExecution({
        conversationId: 'conv-1',
        executionId: 'exec-1',
        signal: controller.signal,
      })
    );

    expect(http.get).toHaveBeenCalledWith(
      reattachPath('exec-1'),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it('fails without retrying when the execution is not found', async () => {
    const { http, service } = setup();
    const notFound = Object.assign(new Error('Not Found'), {
      request: {},
      response: { status: 404 },
    });
    http.get.mockRejectedValueOnce(notFound);

    await expect(
      lastValueFrom(service.attachToExecution({ conversationId: 'conv-1', executionId: 'gone' }))
    ).rejects.toBe(notFound);

    expect(http.get).toHaveBeenCalledTimes(1);
  });
});

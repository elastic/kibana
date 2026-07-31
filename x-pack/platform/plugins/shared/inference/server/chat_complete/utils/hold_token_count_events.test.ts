/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, concat, defer, from, of, throwError, toArray, firstValueFrom, retry } from 'rxjs';
import type { ChatCompletionEvent } from '@kbn/inference-common';
import { chunkEvent, tokensEvent, messageEvent } from '../../test_utils/chat_complete_events';
import { holdTokenCountEventsUntilMessage } from './hold_token_count_events';

describe('holdTokenCountEventsUntilMessage', () => {
  it('passes chunk events through immediately and holds token events until the message', () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const emitted: ChatCompletionEvent[] = [];

    source$.pipe(holdTokenCountEventsUntilMessage()).subscribe((event) => emitted.push(event));

    const chunk = chunkEvent('chunk-1');
    const tokens = tokensEvent();
    const message = messageEvent('message');

    source$.next(chunk);
    source$.next(tokens);
    expect(emitted).toEqual([chunk]);

    source$.next(message);
    expect(emitted).toEqual([chunk, tokens, message]);
  });

  it('drops held token events when the source errors', () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const emitted: ChatCompletionEvent[] = [];
    let caughtError: unknown;

    source$.pipe(holdTokenCountEventsUntilMessage()).subscribe({
      next: (event) => emitted.push(event),
      error: (error) => {
        caughtError = error;
      },
    });

    source$.next(chunkEvent('chunk-1'));
    source$.next(tokensEvent());
    source$.error(new Error('validation failed'));

    expect(emitted).toEqual([chunkEvent('chunk-1')]);
    expect(caughtError).toEqual(new Error('validation failed'));
  });

  it('flushes held token events if the source completes without a message event', async () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const eventsPromise = firstValueFrom(
      source$.pipe(holdTokenCountEventsUntilMessage(), toArray())
    );

    source$.next(chunkEvent('chunk-1'));
    source$.next(tokensEvent());
    source$.complete();

    expect(await eventsPromise).toEqual([chunkEvent('chunk-1'), tokensEvent()]);
  });

  it('only emits the successful attempt token events when combined with retry', async () => {
    let attempt = 0;
    const failedTokens = tokensEvent({ prompt: 1, completion: 2, total: 3 }, { model: 'failed' });
    const successTokens = tokensEvent({ prompt: 4, completion: 5, total: 6 }, { model: 'success' });

    const attempt2Events: ChatCompletionEvent[] = [successTokens, messageEvent('message')];
    const source$ = defer(() => {
      attempt++;
      if (attempt === 1) {
        return concat(
          of<ChatCompletionEvent>(failedTokens),
          throwError(() => new Error('attempt 1 failed'))
        );
      }
      return from(attempt2Events);
    });

    const events = await firstValueFrom(
      source$.pipe(holdTokenCountEventsUntilMessage(), retry({ count: 1 }), toArray())
    );

    expect(events).toEqual([successTokens, messageEvent('message')]);
  });
});

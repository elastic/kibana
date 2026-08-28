/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, concat, defer, from, of, throwError, toArray, firstValueFrom } from 'rxjs';
import type { ChatCompletionEvent } from '@kbn/inference-common';
import { chunkEvent, tokensEvent, messageEvent } from '../../test_utils/chat_complete_events';
import {
  holdTokenCountEventsUntilMessage,
  retryHoldingTokenCountEvents,
} from './hold_token_count_events';

describe('holdTokenCountEventsUntilMessage', () => {
  it('passes chunk events through immediately and holds token events until the message', () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const emitted: ChatCompletionEvent[] = [];

    source$
      .pipe(holdTokenCountEventsUntilMessage({ discardHeldOnError: () => true }))
      .subscribe((event) => emitted.push(event));

    const chunk = chunkEvent('chunk-1');
    const tokens = tokensEvent();
    const message = messageEvent('message');

    source$.next(chunk);
    source$.next(tokens);
    expect(emitted).toEqual([chunk]);

    source$.next(message);
    expect(emitted).toEqual([chunk, tokens, message]);
  });

  it('drops held token events when the source errors and discardHeldOnError returns true', () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const emitted: ChatCompletionEvent[] = [];
    let caughtError: unknown;

    source$.pipe(holdTokenCountEventsUntilMessage({ discardHeldOnError: () => true })).subscribe({
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

  it('flushes held token events before the error when discardHeldOnError returns false', () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const emitted: ChatCompletionEvent[] = [];
    let caughtError: unknown;

    source$.pipe(holdTokenCountEventsUntilMessage({ discardHeldOnError: () => false })).subscribe({
      next: (event) => emitted.push(event),
      error: (error) => {
        caughtError = error;
      },
    });

    source$.next(chunkEvent('chunk-1'));
    source$.next(tokensEvent());
    source$.error(new Error('terminal failure'));

    expect(emitted).toEqual([chunkEvent('chunk-1'), tokensEvent()]);
    expect(caughtError).toEqual(new Error('terminal failure'));
  });

  it('flushes held token events if the source completes without a message event', async () => {
    const source$ = new Subject<ChatCompletionEvent>();
    const eventsPromise = firstValueFrom(
      source$.pipe(holdTokenCountEventsUntilMessage({ discardHeldOnError: () => true }), toArray())
    );

    source$.next(chunkEvent('chunk-1'));
    source$.next(tokensEvent());
    source$.complete();

    expect(await eventsPromise).toEqual([chunkEvent('chunk-1'), tokensEvent()]);
  });
});

describe('retryHoldingTokenCountEvents', () => {
  const failedTokens = tokensEvent({ prompt: 1, completion: 2, total: 3 }, { model: 'failed' });
  const successTokens = tokensEvent({ prompt: 4, completion: 5, total: 6 }, { model: 'success' });

  it('discards a retried attempt token counts and emits only the successful attempt', async () => {
    let attempt = 0;
    const attempt2Events: ChatCompletionEvent[] = [successTokens, messageEvent('message')];
    const source$ = defer(() => {
      attempt++;
      if (attempt === 1) {
        return concat(
          of(failedTokens),
          throwError(() => new Error('attempt 1 failed'))
        );
      }
      return from(attempt2Events);
    });

    const events = await firstValueFrom(
      source$.pipe(retryHoldingTokenCountEvents({ maxRetry: 1, initialDelay: 1 }), toArray())
    );

    expect(events).toEqual([successTokens, messageEvent('message')]);
  });

  it('flushes token counts before a non-retryable error', async () => {
    const source$ = concat(
      of(failedTokens),
      throwError(() => new Error('non retryable'))
    );

    const emitted: ChatCompletionEvent[] = [];
    let caughtError: unknown;

    await new Promise<void>((resolve) => {
      source$
        .pipe(retryHoldingTokenCountEvents({ maxRetry: 3, errorFilter: () => false }))
        .subscribe({
          next: (event) => emitted.push(event),
          error: (error) => {
            caughtError = error;
            resolve();
          },
        });
    });

    expect(emitted).toEqual([failedTokens]);
    expect(caughtError).toEqual(new Error('non retryable'));
  });

  it('resets the retry prediction counter for each subscription', async () => {
    let attempt = 0;
    const source$ = defer(() => {
      attempt++;
      if (attempt % 2 === 1) {
        return concat(
          of(failedTokens),
          throwError(() => new Error(`attempt ${attempt} failed`))
        );
      }
      return from([successTokens, messageEvent('message')]);
    });

    const composed$ = source$.pipe(retryHoldingTokenCountEvents({ maxRetry: 1, initialDelay: 1 }));

    expect(await firstValueFrom(composed$.pipe(toArray()))).toEqual([
      successTokens,
      messageEvent('message'),
    ]);
    expect(await firstValueFrom(composed$.pipe(toArray()))).toEqual([
      successTokens,
      messageEvent('message'),
    ]);
  });

  it('flushes the final attempt token counts when retries are exhausted', async () => {
    let attempt = 0;
    const source$ = defer(() => {
      attempt++;
      const tokens = attempt === 1 ? failedTokens : successTokens;
      return concat(
        of(tokens),
        throwError(() => new Error(`attempt ${attempt} failed`))
      );
    });

    const emitted: ChatCompletionEvent[] = [];
    let caughtError: unknown;

    await new Promise<void>((resolve) => {
      source$.pipe(retryHoldingTokenCountEvents({ maxRetry: 1, initialDelay: 1 })).subscribe({
        next: (event) => emitted.push(event),
        error: (error) => {
          caughtError = error;
          resolve();
        },
      });
    });

    expect(emitted).toEqual([successTokens]);
    expect(caughtError).toEqual(new Error('attempt 2 failed'));
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, Subject, toArray } from 'rxjs';
import { createInferenceProviderError } from '@kbn/inference-common';
import { retryWithExponentialBackoff } from '../../../common/utils/retry_with_exponential_backoff';
import { skipStreamedOutputFromRetryableAttempts } from './skip_attempt_output';

// tool-call chunk: held back until the attempt proves successful
const chunkEvent = (text: string): any => ({
  type: 'chatCompletionChunk',
  content: text,
  tool_calls: [{ index: 0, toolCallId: 'call', function: { name: 'tool', arguments: text } }],
});
// text-only chunk: streams through immediately
const textChunk = (text: string): any => ({
  type: 'chatCompletionChunk',
  content: text,
  tool_calls: [],
});
const tokensEvent = { type: 'chatCompletionTokenCount' } as any;
const messageEvent = { type: 'chatCompletionMessage' } as any;
const stallError = () => createInferenceProviderError('Inference stream idle', { status: 504 });

describe('skipStreamedOutputFromRetryableAttempts', () => {
  describe('composed with retryWithExponentialBackoff', () => {
    const maxRetry = 1;

    it('does not expose a stalled attempt partial output; only the retry is visible', async () => {
      let attempt = 0;
      let errorCount = 0;
      const events = await defer(() => {
        attempt += 1;
        const subject = new Subject<any>();
        queueMicrotask(() => {
          if (attempt === 1) {
            // stalls partway through streaming its response
            subject.next(chunkEvent('partial tool arguments {"'));
            subject.next(tokensEvent);
            setTimeout(() => subject.error(stallError()), 0);
          } else {
            subject.next(chunkEvent('valid response'));
            subject.next(messageEvent);
            subject.complete();
          }
        });
        return subject;
      })
        .pipe(
          skipStreamedOutputFromRetryableAttempts({
            discardHeldChunksOnError: (error) => {
              errorCount += 1;
              return errorCount <= maxRetry;
            },
          }),
          retryWithExponentialBackoff({ maxRetry, initialDelay: 1 }),
          toArray()
        )
        .toPromise();

      expect(attempt).toBe(2);
      expect(events).toEqual([tokensEvent, chunkEvent('valid response'), messageEvent]);
    });

    it('drops all partial output when every attempt fails and the operator is told every error will be retried', async () => {
      let attempt = 0;
      const emitted: unknown[] = [];
      const caught = await new Promise<unknown>((resolve) => {
        defer(() => {
          attempt += 1;
          const subject = new Subject<any>();
          queueMicrotask(() => {
            subject.next(chunkEvent(`attempt ${attempt} partial`));
            setTimeout(() => subject.error(stallError()), 0);
          });
          return subject;
        })
          .pipe(
            skipStreamedOutputFromRetryableAttempts({
              discardHeldChunksOnError: () => true,
            }),
            retryWithExponentialBackoff({ maxRetry, initialDelay: 1 })
          )
          .subscribe({
            next: (event) => emitted.push(event),
            error: resolve,
          });
      });

      expect(attempt).toBe(2);
      expect(emitted).toEqual([]);
      expect(caught).toBeInstanceOf(Error);
    });

    it('flushes the buffered chunks before a terminal error', async () => {
      // maxRetries: 0 — the first error is terminal, callers that used to get
      // partial output before the error must keep getting it
      const upstream = new Subject<any>();
      const emitted: unknown[] = [];
      const caught = await new Promise<unknown>((resolve) => {
        upstream
          .pipe(skipStreamedOutputFromRetryableAttempts({ discardHeldChunksOnError: () => false }))
          .subscribe({ next: (event) => emitted.push(event), error: resolve });
        queueMicrotask(() => {
          upstream.next(chunkEvent('partial'));
          upstream.next(tokensEvent);
          const error = stallError();
          upstream.error(error);
        });
      });

      expect(emitted).toEqual([tokensEvent, chunkEvent('partial')]);
      expect(caught).toBeInstanceOf(Error);
    });

    it('flushes the buffered chunks when the retry budget is exhausted', async () => {
      // maxRetries: 1 — the second attempt's error is terminal, so its partial
      // output is flushed rather than silently dropped
      let attempt = 0;
      let errorCount = 0;
      const emitted: unknown[] = [];
      const caught = await new Promise<unknown>((resolve) => {
        defer(() => {
          attempt += 1;
          const subject = new Subject<any>();
          queueMicrotask(() => {
            subject.next(chunkEvent(`attempt ${attempt} partial`));
            setTimeout(() => subject.error(stallError()), 0);
          });
          return subject;
        })
          .pipe(
            skipStreamedOutputFromRetryableAttempts({
              discardHeldChunksOnError: (error) => {
                errorCount += 1;
                return errorCount <= 1;
              },
            }),
            retryWithExponentialBackoff({ maxRetry: 1, initialDelay: 1 })
          )
          .subscribe({
            next: (event) => emitted.push(event),
            error: resolve,
          });
      });

      expect(attempt).toBe(2);
      // the first (retried) attempt's chunks are discarded; the terminal one's are flushed
      expect(emitted).toEqual([chunkEvent('attempt 2 partial')]);
      expect(caught).toBeInstanceOf(Error);
    });

    it('forwards non-retryable errors so downstream retry logic still controls the outcome', async () => {
      const upstream = new Subject<any>();
      const result = upstream
        .pipe(
          skipStreamedOutputFromRetryableAttempts({
            discardHeldChunksOnError: () => true,
          }),
          retryWithExponentialBackoff({ maxRetry: 3, initialDelay: 1, errorFilter: () => false }),
          toArray()
        )
        .toPromise();

      upstream.next(chunkEvent('partial'));
      const error = stallError();
      upstream.error(error);

      await expect(result).rejects.toBe(error);
    });

    it('streams text-only chunks before the source completes', () => {
      const upstream = new Subject<any>();
      const emitted: unknown[] = [];
      upstream
        .pipe(skipStreamedOutputFromRetryableAttempts({ discardHeldChunksOnError: () => true }))
        .subscribe((event) => emitted.push(event));

      upstream.next(textChunk('a'));
      expect(emitted).toEqual([textChunk('a')]);
      upstream.next(textChunk('b'));
      expect(emitted).toEqual([textChunk('a'), textChunk('b')]);
    });

    it('holds a tool-call chunk and everything after it, keeping event order', () => {
      const upstream = new Subject<any>();
      const emitted: unknown[] = [];
      upstream
        .pipe(skipStreamedOutputFromRetryableAttempts({ discardHeldChunksOnError: () => true }))
        .subscribe((event) => emitted.push(event));

      upstream.next(textChunk('thinking'));
      upstream.next(chunkEvent('{"a"'));
      upstream.next(textChunk('after'));
      expect(emitted).toEqual([textChunk('thinking')]);

      upstream.next(messageEvent);
      expect(emitted).toEqual([
        textChunk('thinking'),
        chunkEvent('{"a"'),
        textChunk('after'),
        messageEvent,
      ]);
    });

    it('drops a retried attempt held tool-call chunks but not the text it already streamed', async () => {
      let attempt = 0;
      let errorCount = 0;
      const events = await defer(() => {
        attempt += 1;
        const subject = new Subject<any>();
        queueMicrotask(() => {
          if (attempt === 1) {
            subject.next(textChunk('hello'));
            subject.next(chunkEvent('partial {"'));
            setTimeout(() => subject.error(stallError()), 0);
          } else {
            subject.next(chunkEvent('{}'));
            subject.next(messageEvent);
            subject.complete();
          }
        });
        return subject;
      })
        .pipe(
          skipStreamedOutputFromRetryableAttempts({
            discardHeldChunksOnError: () => {
              errorCount += 1;
              return errorCount <= 1;
            },
          }),
          retryWithExponentialBackoff({ maxRetry: 1, initialDelay: 1 }),
          toArray()
        )
        .toPromise();

      expect(events).toEqual([textChunk('hello'), chunkEvent('{}'), messageEvent]);
    });

    it('publishes the buffered chunks of a successful attempt, order preserved', async () => {
      const upstream = new Subject<any>();
      const result = upstream
        .pipe(
          skipStreamedOutputFromRetryableAttempts({ discardHeldChunksOnError: () => true }),
          toArray()
        )
        .toPromise();

      upstream.next(chunkEvent('a'));
      upstream.next(tokensEvent);
      upstream.next(chunkEvent('b'));
      upstream.next(messageEvent);
      upstream.next(chunkEvent('tail after message'));
      upstream.complete();

      await expect(result).resolves.toEqual([
        tokensEvent,
        chunkEvent('a'),
        chunkEvent('b'),
        messageEvent,
        chunkEvent('tail after message'),
      ]);
    });
  });
});

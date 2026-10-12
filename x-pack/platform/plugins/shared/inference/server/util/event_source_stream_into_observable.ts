/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'node:stream';
import { createParser } from 'eventsource-parser';
import { Observable } from 'rxjs';
import {
  createInferenceProviderError,
  createInferenceRequestError,
  MAX_STREAM_DURATION_MS,
} from '@kbn/inference-common';

export function eventSourceStreamIntoObservable(
  readable: Readable,
  {
    maxDurationMs = MAX_STREAM_DURATION_MS,
    idleTimeoutMs,
  }: {
    /** Total backstop for the whole stream. Expiry is NOT retryable (408). */
    maxDurationMs?: number;
    /**
     * Max silence between chunks, counted from subscription. Expiry is retryable (504).
     * Opt-in: no idle guard is armed when omitted.
     */
    idleTimeoutMs?: number;
  } = {}
) {
  return new Observable<string>((subscriber) => {
    const parser = createParser({
      onEvent: (event) => {
        subscriber.next(event.data);
      },
    });

    let tornDown = false;
    const deadline = Date.now() + maxDurationMs;
    const createTimeoutError = () =>
      createInferenceRequestError(
        `Inference stream exceeded the maximum allowed duration of ${maxDurationMs}ms`,
        408
      );

    // idle-stream guard only: a busy stream drains on the microtask queue,
    // starving timers — the in-band deadline check below covers that case
    const maxDurationTimer = setTimeout(() => {
      readable.destroy(createTimeoutError());
    }, maxDurationMs);

    async function processStream() {
      for await (const chunk of readable) {
        armIdleTimer();
        if (Date.now() > deadline) {
          throw createTimeoutError();
        }
        parser.feed(chunk.toString());
        // yield a macrotask per chunk so timers and cancellation stay serviced
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    // a stalled endpoint is worth retrying, unlike the total-duration cap above
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const armIdleTimer = () => {
      if (idleTimeoutMs === undefined) {
        return;
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        readable.destroy(
          createInferenceProviderError(`Inference stream idle for ${idleTimeoutMs}ms`, {
            status: 504,
          })
        );
      }, idleTimeoutMs);
    };
    armIdleTimer();

    processStream().then(
      () => {
        subscriber.complete();
      },
      (error) => {
        // a teardown-initiated destroy rejects the iteration with a premature
        // close error that must not surface after unsubscription
        if (!tornDown) {
          subscriber.error(error);
        }
      }
    );

    return () => {
      tornDown = true;
      clearTimeout(maxDurationTimer);
      clearTimeout(idleTimer);
      readable.destroy();
    };
  });
}

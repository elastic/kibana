/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under
 * one or more contributor license agreements. Licensed under the Elastic
 * License 2.0; you may not use this file except in compliance with the Elastic
 * License 2.0.
 */

import { timer } from 'rxjs';
import { eventSourceStreamIntoObservable } from './event_source_stream_into_observable';

/**
 * The observable's teardown must guarantee that no idle timer remains armed
 * after unsubscription. Without the `tornDown` check in the stream loop, a
 * buffered chunk delivered after teardown re-arms the idle timer and nothing
 * clears it, keeping Node's event loop alive for `idleTimeoutMs` (120s default).
 */
describe('eventSourceStreamIntoObservable teardown', () => {
  it('does not re-arm the idle timer when a buffered chunk resumes the loop after teardown', async () => {
    const idleTimeoutMs = 50;

    let secondPending = false;

    const originalSetTimeout = globalThis.setTimeout;
    let idleTimerArmedAfterTeardown = false;
    let teardown = false;
    const spy = jest.spyOn(globalThis, 'setTimeout').mockImplementation(((
      handler: any,
      ms?: number,
      ...args: any[]
    ) => {
      if (ms === idleTimeoutMs && teardown) {
        idleTimerArmedAfterTeardown = true;
      }
      return originalSetTimeout(handler, ms, ...args);
    }) as any);

    // A real Readable cannot exercise this interleaving: teardown's
    // `destroy()` always rejects a pending `for await` iteration with
    // "Premature close", so the loop body never resumes with a chunk. A
    // controlled async iterable stands in for the stream: its second
    // `next()` parks until resolved AFTER teardown has run, mirroring a
    // chunk that was already in flight when the caller unsubscribed.
    const iterable: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => ({
        next: () =>
          new Promise<{ value: string; done: boolean }>((resolve) => {
            if (!secondPending) {
              secondPending = true;
              resolve({ value: 'data: {"a":1}\n\n', done: false });
            } else {
              // park until the test resolves it after teardown
              resolvePending = resolve;
            }
          }),
        return: () => Promise.resolve({ value: undefined, done: true }),
      }),
    };
    let resolvePending: ((result: { value: string; done: boolean }) => void) | undefined;
    const fakeReadable = {
      [Symbol.asyncIterator]: iterable[Symbol.asyncIterator],
      destroy: () => {},
    };

    try {
      const subscription = eventSourceStreamIntoObservable(fakeReadable as any, {
        idleTimeoutMs,
        maxDurationMs: idleTimeoutMs * 100,
      }).subscribe(() => {});

      // let the loop consume chunk a and park awaiting the second next()
      await timer(20).toPromise();

      teardown = true;
      subscription.unsubscribe();
      // deliver the already-pending second chunk AFTER teardown
      resolvePending?.({ value: 'data: {"b":2}\n\n', done: false });

      await timer(idleTimeoutMs * 3).toPromise();

      // no idle timer was armed after teardown (mutation-sensitive: removing
      // the tornDown guard makes the resumed loop arm one)
      expect(idleTimerArmedAfterTeardown).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

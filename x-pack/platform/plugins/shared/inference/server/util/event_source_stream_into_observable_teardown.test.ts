/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
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

    const readable = new Readable({ read() {} });
    readable.push('data: {"a":1}\n\n');

    let unsubscribeTime: number | undefined;
    const idleTimerArmedAfterTeardown = { value: false };

    const originalSetTimeout = globalThis.setTimeout;
    const spy = jest
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(((handler: any, ms?: number, ...args: any[]) => {
        if (ms === idleTimeoutMs && unsubscribeTime !== undefined && Date.now() >= unsubscribeTime) {
          idleTimerArmedAfterTeardown.value = true;
        }
        return originalSetTimeout(handler, ms, ...args);
      }) as any);

    try {
      const subscription = eventSourceStreamIntoObservable(readable, { idleTimeoutMs }).subscribe(
        () => {
          // unsubscribe one macrotask after the first event, while the loop
          // body is parked at its setImmediate yield
          setTimeout(() => {
            unsubscribeTime = Date.now();
            subscription.unsubscribe();
            // a second chunk was already buffered (or arrives now): without the
            // tornDown guard the loop resumes and re-arms the idle timer
            readable.push('data: {"b":2}\n\n');
          }, 0);
        }
      );

      await timer(idleTimeoutMs * 5).toPromise();
      subscription.unsubscribe();

      expect(idleTimerArmedAfterTeardown.value).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

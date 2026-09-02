/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'node:stream';
import { toArray, firstValueFrom } from 'rxjs';
import { isInferenceRequestError } from '@kbn/inference-common';
import { eventSourceStreamIntoObservable } from './event_source_stream_into_observable';

describe('eventSourceStreamIntoObservable', () => {
  it('emits for a single-chunk event', async () => {
    const someMessage = JSON.stringify({ foo: 'bar' });
    const stream = Readable.from([`data: ${someMessage}\n\n`]);

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual([someMessage]);
  });

  it('emits for single-chunk events', async () => {
    const messages = [JSON.stringify({ foo: 'bar' }), '42', JSON.stringify({ foo: 'dolly' })];
    const stream = Readable.from(messages.map((message) => `data: ${message}\n\n`));

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(messages);
  });

  it('emits for a multi-chunk event', async () => {
    const stream = Readable.from([`data: abc`, `de`, `fgh\n\n`]);

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(['abcdefgh']);
  });

  it('emits for a multi-events chunk', async () => {
    const stream = Readable.from([`data: A\n\ndata: B\n\ndata: C\n\n`]);

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(['A', 'B', 'C']);
  });

  it('emits for split chunk events', async () => {
    const stream = Readable.from([`data: 42\n\ndata: `, `9000\n\nda`, `ta: 51\n\n`]);

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(['42', '9000', '51']);
  });

  it('destroys the underlying stream when the subscriber unsubscribes', () => {
    const stream = new Readable({ read: () => {} });

    const subscription = eventSourceStreamIntoObservable(stream).subscribe();
    expect(stream.destroyed).toBe(false);

    subscription.unsubscribe();
    expect(stream.destroyed).toBe(true);
  });

  it('destroys the stream and errors the subscriber when maxDurationMs is exceeded', async () => {
    jest.useFakeTimers();
    try {
      const stream = new Readable({ read: () => {} });

      const error$ = new Promise<unknown>((resolve) => {
        eventSourceStreamIntoObservable(stream, { maxDurationMs: 1_000 }).subscribe({
          error: resolve,
        });
      });

      jest.advanceTimersByTime(1_001);

      const error = await error$;
      expect(stream.destroyed).toBe(true);
      // pin the error type: requestError is not retried by the default retry
      // filter, while a providerError with this status would be
      expect(isInferenceRequestError(error)).toBe(true);
      expect(error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('maximum allowed duration'),
          meta: expect.objectContaining({ status: 408 }),
        })
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('enforces the deadline in-band when the timers phase is starved', async () => {
    const start = Date.now();
    const nowSpy = jest.spyOn(Date, 'now');
    try {
      const stream = new Readable({ read: () => {} });

      const error$ = new Promise<unknown>((resolve) => {
        eventSourceStreamIntoObservable(stream, { maxDurationMs: 60_000 }).subscribe({
          error: resolve,
        });
      });

      // advance time without letting any timer fire
      nowSpy.mockReturnValue(start + 61_000);
      stream.push('data: too late\n\n');

      const error = await error$;
      expect(stream.destroyed).toBe(true);
      expect(isInferenceRequestError(error)).toBe(true);
      expect(error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('maximum allowed duration'),
          meta: expect.objectContaining({ status: 408 }),
        })
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('yields to the macrotask queue between chunks', async () => {
    const chunkCount = 20;
    // objectMode keeps each buffered push a distinct chunk
    const stream = new Readable({ objectMode: true, read: () => {} });
    for (let i = 1; i <= chunkCount; i++) {
      stream.push(`data: ${i}\n\n`);
    }
    stream.push(null);

    const emitted: string[] = [];
    const completion = new Promise<void>((resolve, reject) => {
      eventSourceStreamIntoObservable(stream).subscribe({
        next: (value) => emitted.push(value),
        error: reject,
        complete: resolve,
      });
    });

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.length).toBeLessThan(chunkCount);

    await completion;
    expect(emitted).toHaveLength(chunkCount);
  });

  it('completes normally when the stream ends before maxDurationMs', async () => {
    const messages = [JSON.stringify({ foo: 'bar' }), '42'];
    const stream = Readable.from(messages.map((message) => `data: ${message}\n\n`));

    const results = await firstValueFrom(
      eventSourceStreamIntoObservable(stream, { maxDurationMs: 5_000 }).pipe(toArray())
    );

    expect(results).toEqual(messages);
  });

  it('propagates errors emitted by the stream itself', async () => {
    const stream = new Readable({ read: () => {} });

    const error$ = new Promise<unknown>((resolve) => {
      eventSourceStreamIntoObservable(stream).subscribe({ error: resolve });
    });

    stream.destroy(new Error('boom'));

    const error = await error$;
    expect(error).toEqual(expect.objectContaining({ message: 'boom' }));
  });

  it('clears the cap timer once the stream completes', async () => {
    jest.useFakeTimers();
    try {
      const stream = Readable.from([`data: 42\n\n`]);

      const results$ = firstValueFrom(
        eventSourceStreamIntoObservable(stream, { maxDurationMs: 5_000 }).pipe(toArray())
      );
      await jest.advanceTimersByTimeAsync(1);

      expect(await results$).toEqual(['42']);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});

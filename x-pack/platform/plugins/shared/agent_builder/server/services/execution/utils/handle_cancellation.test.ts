/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Subject, toArray, firstValueFrom } from 'rxjs';
import { isRequestAbortedError } from '@kbn/agent-builder-common';
import { handleCancellation } from './handle_cancellation';

describe('handleCancellation', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('mirrors the source when the abort signal is not triggered', async () => {
    const abortController = new AbortController();
    const source$ = of(1, 2, 3);

    const events = await firstValueFrom(
      source$.pipe(handleCancellation(abortController.signal), toArray())
    );

    expect(events).toEqual([1, 2, 3]);
  });

  it('mirrors the source when no signal is given', async () => {
    const events = await firstValueFrom(of(1, 2).pipe(handleCancellation(undefined), toArray()));
    expect(events).toEqual([1, 2]);
  });

  it('forwards a source error unchanged when not aborted', () => {
    const abortController = new AbortController();
    const source$ = new Subject<number>();
    const original = new Error('boom');
    let thrown: unknown;

    source$.pipe(handleCancellation(abortController.signal)).subscribe({
      error: (err) => {
        thrown = err;
      },
    });
    source$.error(original);

    expect(thrown).toBe(original);
  });

  it('keeps forwarding after abort and errors with RequestAbortedError once the source completes', () => {
    const abortController = new AbortController();
    const source$ = new Subject<number>();
    const values: number[] = [];
    let thrown: unknown;

    source$.pipe(handleCancellation(abortController.signal)).subscribe({
      next: (value) => values.push(value),
      error: (err) => {
        thrown = err;
      },
    });

    source$.next(1);
    abortController.abort();
    source$.next(2);
    source$.complete();

    expect(values).toEqual([1, 2]);
    expect(isRequestAbortedError(thrown)).toBe(true);
    expect((thrown as Error).message).toContain('Converse request was aborted');
  });

  it('normalises a source error raised after abort to RequestAbortedError', () => {
    const abortController = new AbortController();
    const source$ = new Subject<number>();
    let thrown: unknown;

    source$.pipe(handleCancellation(abortController.signal)).subscribe({
      error: (err) => {
        thrown = err;
      },
    });

    abortController.abort();
    source$.error(new Error('AbortError'));

    expect(isRequestAbortedError(thrown)).toBe(true);
  });

  it('cuts the source and errors after the deadline if the source never terminates', () => {
    jest.useFakeTimers();
    const abortController = new AbortController();
    const source$ = new Subject<number>();
    let thrown: unknown;

    source$.pipe(handleCancellation(abortController.signal, { deadlineMs: 1000 })).subscribe({
      error: (err) => {
        thrown = err;
      },
    });

    abortController.abort();
    expect(thrown).toBeUndefined();
    expect(source$.observed).toBe(true);

    jest.advanceTimersByTime(999);
    expect(thrown).toBeUndefined();

    jest.advanceTimersByTime(1);
    expect(isRequestAbortedError(thrown)).toBe(true);
    expect(source$.observed).toBe(false);
  });

  it('does not fire the deadline once the source has terminated', () => {
    jest.useFakeTimers();
    const abortController = new AbortController();
    const source$ = new Subject<number>();
    const error = jest.fn();

    source$.pipe(handleCancellation(abortController.signal, { deadlineMs: 1000 })).subscribe({
      error,
    });

    abortController.abort();
    source$.complete();
    jest.advanceTimersByTime(1000);

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('errors when the signal is already aborted and the source completes', () => {
    const abortController = new AbortController();
    abortController.abort();
    let thrown: unknown;

    of(1, 2)
      .pipe(handleCancellation(abortController.signal))
      .subscribe({
        error: (err) => {
          thrown = err;
        },
      });

    expect(isRequestAbortedError(thrown)).toBe(true);
  });

  it('tears down the source and the deadline on unsubscribe', () => {
    jest.useFakeTimers();
    const abortController = new AbortController();
    const source$ = new Subject<number>();
    const error = jest.fn();

    const subscription = source$
      .pipe(handleCancellation(abortController.signal, { deadlineMs: 1000 }))
      .subscribe({ error });

    abortController.abort();
    subscription.unsubscribe();
    jest.advanceTimersByTime(1000);

    expect(source$.observed).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});

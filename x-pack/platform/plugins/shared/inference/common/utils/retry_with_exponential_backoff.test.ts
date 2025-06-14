/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { retryWithExponentialBackoff } from './retry_with_exponential_backoff';

describe('retryWithExponentialBackoff operator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should eventually succeed after retrying errors', (done) => {
    let attempt = 0;
    const source$ = new Observable<string>((observer) => {
      attempt++;
      // Fail the first two times, then succeed.
      if (attempt < 3) {
        observer.error('something went bad');
      } else {
        observer.next('success');
        observer.complete();
      }
    });

    // We allow up to 5 retries; our error filter only retries on status === 400.
    const result$ = source$.pipe(
      retryWithExponentialBackoff({
        maxRetry: 5,
        initialDelay: 1000,
        backoffMultiplier: 2,
        errorFilter: (err) => true,
      })
    );

    const values: string[] = [];
    result$.subscribe({
      next: (value) => values.push(value),
      error: (err) => {
        throw new Error('Observable did throw and should not have');
      },
      complete: () => {
        // Expect the source to have been subscribed 3 times (2 errors, then success)
        expect(values).toEqual(['success']);
        expect(attempt).toBe(3);
        done();
      },
    });

    // First retry: 1000ms, second: 2000ms
    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(2000);
    jest.runOnlyPendingTimers();
  });

  it('should not retry errors that do not match the filter', (done) => {
    let attempt = 0;
    const source$ = new Observable<string>((observer) => {
      attempt++;
      observer.error({ status: 500, message: 'Server Error' });
    });

    // Our filter only retries errors with status === 400.
    const result$ = source$.pipe(
      retryWithExponentialBackoff({
        maxRetry: 5,
        initialDelay: 1000,
        backoffMultiplier: 2,
        errorFilter: (err: any) => err.status === 400,
      })
    );

    result$.subscribe({
      next: () => {
        throw new Error('Observer emitted when it should not have');
      },
      error: (err) => {
        expect(err).toEqual({ status: 500, message: 'Server Error' });
        // Since the error does not match the filter, the source should only be subscribed once.
        expect(attempt).toBe(1);
        done();
      },
      complete: () => {
        throw new Error('Observer completed when it should not have');
      },
    });
  });

  it('should error out after max retries', (done) => {
    let attempt = 0;
    const source$ = new Observable<string>((observer) => {
      attempt++;
      observer.error({ status: 400, message: 'Bad Request' });
    });

    const maxRetries = 3;

    const result$ = source$.pipe(
      retryWithExponentialBackoff({
        maxRetry: maxRetries,
        initialDelay: 1000,
        backoffMultiplier: 2,
        errorFilter: () => true,
      })
    );

    result$.subscribe({
      next: () => {
        throw new Error('Observer emitted when it should not have');
      },
      error: (err) => {
        expect(err).toEqual({ status: 400, message: 'Bad Request' });
        expect(attempt).toBe(maxRetries + 1);
        done();
      },
      complete: () => {
        throw new Error('Observer completed when it should not have');
      },
    });

    // Simulate the delays for each retry:
    // First retry: 1000ms, second: 2000ms, third: 4000ms.
    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(2000);
    jest.advanceTimersByTime(4000);
    jest.runOnlyPendingTimers();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

/**
 * Convert an Observable into an async iterator.
 * (don't ask, langchain is using async iterators for stream mode...)
 */
export function toAsyncIterator<T>(observable: Observable<T>): AsyncIterableIterator<T> {
  let resolve: ((value: IteratorResult<T>) => void) | null = null;
  let reject: ((reason?: any) => void) | null = null;

  // head-index queue: shift() re-indexes the whole array, so draining a
  // large backlog through it is quadratic
  let queue: Array<IteratorResult<T>> = [];
  let head = 0;
  let done = false;
  let error: any = null;

  const subscription = observable.subscribe({
    next(value) {
      if (resolve) {
        resolve({ value, done: false });
        resolve = null;
      } else {
        queue.push({ value, done: false });
      }
    },
    error(err) {
      done = true;
      error = err;
      // Clear any queued values - we fail fast
      queue = [];
      head = 0;
      if (reject) {
        reject(err);
        reject = null;
        resolve = null;
      }
    },
    complete() {
      done = true;
      if (resolve) {
        resolve({ value: undefined, done: true });
        resolve = null;
      }
    },
  });

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      // Check for error first - fail fast
      if (error !== null) {
        return Promise.reject(error);
      }

      if (head < queue.length) {
        const result = queue[head];
        head++;
        if (head === queue.length) {
          queue = [];
          head = 0;
        } else if (head > 1024 && head * 2 >= queue.length) {
          // amortized compaction so consumed entries don't accumulate
          queue = queue.slice(head);
          head = 0;
        }
        return Promise.resolve(result);
      }

      if (done) {
        return Promise.resolve({ value: undefined, done: true });
      }

      return new Promise<IteratorResult<T>>((res, rej) => {
        resolve = res;
        reject = rej;
      });
    },
    return() {
      subscription.unsubscribe();
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(err?: any) {
      subscription.unsubscribe();
      return Promise.reject(err);
    },
  };
}

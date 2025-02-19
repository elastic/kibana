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

  const queue: Array<IteratorResult<T>> = [];
  let done = false;

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
      if (reject) {
        reject(err);
        reject = null;
      } else {
        queue.push(Promise.reject(err) as any); // Queue an error
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
      if (queue.length > 0) {
        return Promise.resolve(queue.shift()!);
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
    throw(error?: any) {
      subscription.unsubscribe();
      return Promise.reject(error);
    },
  };
}

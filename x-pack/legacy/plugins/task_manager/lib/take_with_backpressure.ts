/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscriber } from 'rxjs';

export enum TAKE_RESULT {
  TAKEN = 'TAKEN',
  TAKE_REJECTED = 'TAKE_REJECTED',
  RAN_OUT_OF_CAPACITY = 'RAN_OUT_OF_CAPACITY',
  TAKE_FAILURE = 'TAKE_FAILURE',
}

interface BackpressuredTakeState<T> {
  capacity: number;
  pending: number;
  taken: number;
  queue: BackpressuredTakeSubject[];
}

interface BackpressuredTakeSubject {
  attemptToTake: () => Promise<boolean>;
  skip: () => void;
  fail: () => void;
}

function drainQueue(
  queue: BackpressuredTakeSubject[],
  apply: (subject: BackpressuredTakeSubject) => void
) {
  while (queue.length) {
    apply(queue.shift()!);
  }
}

function failSubject(subject: BackpressuredTakeSubject) {
  subject.fail();
}

function skipSubject(subject: BackpressuredTakeSubject) {
  subject.skip();
}

async function poll<T>(
  state: BackpressuredTakeState<T>,
  observer: Subscriber<Promise<[TAKE_RESULT, T]>>
) {
  if (state.taken === state.capacity) {
    drainQueue(state.queue, skipSubject);
    observer.complete();
  } else if (state.queue.length && state.taken + state.pending < state.capacity) {
    state.pending++;
    const subject = state.queue.shift()!;
    try {
      if (await subject.attemptToTake()) {
        state.taken++;
      }
    } catch (err) {
      failSubject(subject);
      drainQueue(state.queue, failSubject);
      observer.error(err);
    } finally {
      state.pending--;
      poll(state, observer);
    }
  }
}

async function pushIntoQueue<T>(
  subject: T,
  state: BackpressuredTakeState<T>,
  takeValidator: (subject: T) => Promise<boolean>,
  observer: Subscriber<Promise<[TAKE_RESULT, T]>>
): Promise<[TAKE_RESULT, T]> {
  return new Promise(resolve => {
    state.queue.push({
      async attemptToTake() {
        if (await takeValidator(subject)) {
          resolve([TAKE_RESULT.TAKEN, subject]);
          return true;
        } else {
          resolve([TAKE_RESULT.TAKE_REJECTED, subject]);
          return false;
        }
      },
      skip() {
        resolve([TAKE_RESULT.RAN_OUT_OF_CAPACITY, subject]);
      },
      fail() {
        resolve([TAKE_RESULT.TAKE_FAILURE, subject]);
      },
    });
    poll(state, observer);
  });
}

export function takeWithBackpressure<T>(
  takeValidator: (subject: T) => Promise<boolean>,
  capacity: number
) {
  return (source: Observable<T>) => {
    const state: BackpressuredTakeState<T> = {
      capacity,
      pending: 0,
      taken: 0,
      queue: [],
    };
    return new Observable<Promise<[TAKE_RESULT, T]>>(observer => {
      return source.subscribe({
        next(nextSubject) {
          observer.next(
            observer.closed
              ? Promise.resolve([TAKE_RESULT.RAN_OUT_OF_CAPACITY, nextSubject])
              : pushIntoQueue<T>(nextSubject, state, takeValidator, observer)
          );
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
    });
  };
}

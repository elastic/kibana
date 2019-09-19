/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscriber } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

export enum TAKE_RESULT {
  TAKEN = 'TAKEN',
  TAKE_REJECTED = 'TAKE_REJECTED',
  RAN_OUT_OF_CAPACITY = 'RAN_OUT_OF_CAPACITY',
  TAKE_FAILURE = 'TAKE_FAILURE',
}
export type TakeWithBackpressureResult<T> = [TAKE_RESULT, T];

interface BackpressuredTakeState<T> {
  taken: number;
  sourceCompleted: boolean;
  pending: number;
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
): Promise<void | void[]> {
  return Promise.all(queue.splice(0, queue.length).map(apply));
}

function isThereAnyWorkToBeDone<T>(state: BackpressuredTakeState<T>): boolean {
  return state.pending > 0 || !state.sourceCompleted || state.queue.length > 0;
}

function createQueuePoller<T>(
  state: BackpressuredTakeState<T>,
  observer: Subscriber<TakeWithBackpressureResult<T>>,
  capacity: number
): () => void {
  return async function poll() {
    if (state.taken === capacity || !isThereAnyWorkToBeDone(state)) {
      drainQueue(state.queue, subjectToSkip => subjectToSkip.skip()).then(() => {
        observer.complete();
      });
    } else if (state.queue.length && state.taken + state.pending < capacity) {
      const subject = state.queue.shift()!;
      state.pending++;
      try {
        if (await subject.attemptToTake()) {
          state.taken++;
        }
      } catch (err) {
        subject.fail();
        await drainQueue(state.queue, subjectToAbort => subjectToAbort.fail()).then(() => {
          observer.error(err);
          state.pending--;
        });
      } finally {
        state.pending--;
        poll();
      }
    }
  };
}

function pushIntoQueue<T>(
  subject: T,
  state: BackpressuredTakeState<T>,
  takeValidator: (subject: T) => Promise<boolean>,
  poll: () => void
): Promise<TakeWithBackpressureResult<T>> {
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
        return Promise.resolve();
      },
      fail() {
        resolve([TAKE_RESULT.TAKE_FAILURE, subject]);
        return Promise.resolve();
      },
    });
    poll();
  });
}

function handleSubjectAfterCapacityIsReached<T>(
  subject: T
): Promise<TakeWithBackpressureResult<T>> {
  return Promise.resolve([TAKE_RESULT.RAN_OUT_OF_CAPACITY, subject]);
}

export function takeWithBackpressure<T>(
  takeValidator: (subject: T) => Promise<boolean>,
  capacity: number
) {
  return (source: Observable<T>) => {
    const state: BackpressuredTakeState<T> = {
      pending: 0,
      taken: 0,
      queue: [],
      sourceCompleted: false,
    };
    return new Observable<TakeWithBackpressureResult<T>>(observer => {
      const poll = createQueuePoller(state, observer, capacity);
      return source
        .pipe(
          mergeMap(nextSubject => {
            return observer.closed
              ? handleSubjectAfterCapacityIsReached<T>(nextSubject)
              : pushIntoQueue<T>(nextSubject, state, takeValidator, poll);
          })
        )
        .subscribe({
          next(nextSubject: TakeWithBackpressureResult<T>) {
            observer.next(nextSubject);
          },
          complete() {
            state.sourceCompleted = true;
            poll();
          },
        });
    });
  };
}

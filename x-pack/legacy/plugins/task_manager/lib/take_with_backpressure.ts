/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscriber } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { PendingOperations, createPendingOperations } from './pending_operations';

export enum TAKE_RESULT {
  TAKEN = 'TAKEN',
  TAKE_REJECTED = 'TAKE_REJECTED',
  RAN_OUT_OF_CAPACITY = 'RAN_OUT_OF_CAPACITY',
  TAKE_FAILURE = 'TAKE_FAILURE',
}
export type TakeWithBackpressureResult<T> = [TAKE_RESULT, T];

interface BackpressuredTakeState<T> {
  sourceCompleted: boolean;
  pending: PendingOperations<BackpressuredTakeSubject, boolean>;
  queue: BackpressuredTakeSubject[];
}

interface BackpressuredTakeSubject {
  attemptToTake: () => Promise<boolean>;
  skip: () => Promise<void>;
  fail: () => Promise<void>;
}

function drainQueue(
  queue: BackpressuredTakeSubject[],
  apply: (subject: BackpressuredTakeSubject) => void
): Promise<void | void[]> {
  return Promise.all(queue.splice(0, queue.length).map(apply));
}

function drainQueueAsFailure(queue: BackpressuredTakeSubject[]): Promise<void | void[]> {
  return drainQueue(queue, subjectToAbort => subjectToAbort.fail());
}

function isThereAnyWorkToBeDone<T>(state: BackpressuredTakeState<T>): boolean {
  return state.pending.hasPendingTasks || !state.sourceCompleted || state.queue.length > 0;
}

function createQueuePoller<T>(
  state: BackpressuredTakeState<T>,
  observer: Subscriber<TakeWithBackpressureResult<T>>,
  capacity: number
): () => void {
  return async function poll() {
    const { pending, queue } = state;
    if (!isThereAnyWorkToBeDone(state)) {
      observer.complete();
    } else if (queue.length) {
      if (capacity === 0) {
        await drainQueue(queue, subjectToSkip => subjectToSkip.skip());
        await pending.whenPendingTasksComplete();
        poll();
      } else if (pending.pendingTasks < capacity) {
        const subject = queue.shift()!;
        try {
          if (await pending.trackOperationOn(subject, subject.attemptToTake())) {
            capacity--;
          }
          pending.untrack(subject);
        } catch (err) {
          subject.fail();
          await drainQueueAsFailure(queue);
          pending.untrack(subject);
          await pending.whenPendingTasksComplete();
          observer.error(err);
        }
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
        return Promise.resolve(resolve([TAKE_RESULT.RAN_OUT_OF_CAPACITY, subject]));
      },
      fail() {
        return Promise.resolve(resolve([TAKE_RESULT.TAKE_FAILURE, subject]));
      },
    });
    poll();
  });
}

export function takeWithBackpressure<T>(
  takeValidator: (subject: T) => Promise<boolean>,
  capacity: number
) {
  return (source: Observable<T>) => {
    const pending = createPendingOperations<BackpressuredTakeSubject, boolean>();
    const state: BackpressuredTakeState<T> = {
      pending,
      queue: [],
      sourceCompleted: false,
    };
    return new Observable<TakeWithBackpressureResult<T>>(observer => {
      const poll = createQueuePoller(state, observer, capacity);
      return source
        .pipe(mergeMap(nextSubject => pushIntoQueue<T>(nextSubject, state, takeValidator, poll)))
        .subscribe({
          next(nextSubject: TakeWithBackpressureResult<T>) {
            observer.next(nextSubject);
          },
          async error(err) {
            await drainQueueAsFailure(state.queue);
            await pending.whenPendingTasksComplete();
            observer.error(err);
          },
          complete() {
            state.sourceCompleted = true;
            poll();
          },
        });
    });
  };
}

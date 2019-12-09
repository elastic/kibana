/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import { performance } from 'perf_hooks';
import { after } from 'lodash';
import { Subject, merge, partition, interval, of, Observable } from 'rxjs';
import { mapTo, filter, mergeScan, concatMap, tap } from 'rxjs/operators';

import { pipe } from 'fp-ts/lib/pipeable';
import { Option, none, map as mapOptional, isSome, getOrElse } from 'fp-ts/lib/Option';
import { pullFromSet } from './lib/pull_from_set';
import { Result, asOk, asErr } from './lib/result_type';

type WorkFn<T, H> = (...params: T[]) => Promise<H>;

interface Opts<T, H> {
  pollInterval: number;
  getCapacity: () => number;
  pollRequests$: Subject<Option<T>>;
  work: WorkFn<T, H>;
}

/**
 * constructs a new TaskPoller stream, which emits events on demand and on a scheduled interval, waiting for capacity to be available before emitting more events.
 *
 * @param opts
 * @prop {number} pollInterval - How often, in milliseconds, we will an event be emnitted, assuming there's capacity to do so
 * @prop {() => number} getCapacity - A function specifying whether there is capacity to emit new events
 * @prop {Observable<Option<T>>} pollRequests$ - A stream of requests for polling which can provide an optional argument for the polling phase
 *
 * @returns {Observable<Set<T>>} - An observable which emits an event whenever a polling event is due to take place, providing access to a singleton Set representing a queue
 *  of unique request argumets of type T. The queue holds all the buffered request arguments streamed in via pollRequests$
 */
export function createTaskPoller<T, H>({
  pollRequests$,
  pollInterval,
  getCapacity,
  work,
}: Opts<T, H>): Observable<Result<H, string>> {
  const [
    // requests have arguments to be passed to polling events
    requests$,
    // nudge rquests try to cause a polling event early (prior to an interval expiring)
    // but if there is no capacity, they are ignored
    nudgeRequests$,
  ] = partition(pollRequests$, req => isSome(req));

  const hasCapacity = () => getCapacity() > 0;

  // emit an event on a fixed interval, but only if there's capacity
  const pollOnInterval$ = interval(pollInterval).pipe(mapTo(none));
  return merge(
    // buffer all requests, releasing them whenever an interval expires & there's capacity
    requests$,
    // emit an event when we're nudged to poll for work, as long as there's capacity
    merge(pollOnInterval$, nudgeRequests$).pipe(filter(hasCapacity))
  ).pipe(
    // buffer all requests in a single set (to remove duplicates) as we don't want
    // work to take place in parallel (it could cause Task Manager to pull in the same
    // task twice)
    mergeScan<Option<T>, Set<T>>(
      (queue, request) => of(pushOptionalIntoSet(queue, request)),
      new Set<T>()
    ),
    // take as many argumented calls as we have capacity for and call `work` with
    // those arguments. If the queue is empty this will still trigger work to be done
    concatMap(async (set: Set<T>) => {
      closeSleepPerf();
      const workArguments = pullFromSet(set, getCapacity());
      try {
        const workResult = await work(...workArguments);
        return asOk(workResult);
      } catch (err) {
        return asErr(
          `Failed to poll for work${
            workArguments.length ? ` [${workArguments.join()}]` : ``
          }: ${err}`
        );
      }
    }),
    tap(openSleepPerf)
  );
}

const openSleepPerf = () => {
  performance.mark('TaskPoller.sleep');
};
// we only want to close after an open has been called, as we're counting the time *between* work cycles
// so we'll ignore the first call to `closeSleepPerf` but we will run every subsequent call
const closeSleepPerf = after(2, () => {
  performance.mark('TaskPoller.poll');
  performance.measure('TaskPoller.sleepDuration', 'TaskPoller.sleep', 'TaskPoller.poll');
});

/**
 * Unwraps optional values and pushes them into a set
 * @param set A Set of generic type T
 * @param value An optional T to push into the set if it is there
 */
function pushOptionalIntoSet<T>(set: Set<T>, value: Option<T>): Set<T> {
  return pipe(
    value,
    mapOptional<T, Set<T>>(req => {
      set.add(req);
      return set;
    }),
    getOrElse(() => set)
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Subject } from 'rxjs';
import { Option, none, some } from 'fp-ts/lib/Option';
import { createTaskPoller } from './task_poller';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { sleep, resolvable } from './test_utils';
import { asOk, asErr } from './lib/result_type';

describe('TaskPoller', () => {
  beforeEach(() => jest.useFakeTimers());

  test(
    'intializes the poller with the provided interval',
    fakeSchedulers(async advance => {
      const pollInterval = 100;
      const halfInterval = Math.floor(pollInterval / 2);

      const work = jest.fn(async () => true);
      createTaskPoller<void, boolean>({
        pollInterval,
        getCapacity: () => 1,
        work,
        pollRequests$: new Subject<Option<void>>(),
      }).subscribe(() => {});

      // `work` is async, we have to force a node `tick`
      await sleep(0);
      advance(halfInterval);
      expect(work).toHaveBeenCalledTimes(0);
      advance(halfInterval);

      await sleep(0);
      expect(work).toHaveBeenCalledTimes(1);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);
    })
  );

  test(
    'filters interval polling on capacity',
    fakeSchedulers(async advance => {
      const pollInterval = 100;

      const work = jest.fn(async () => true);

      let hasCapacity = true;
      createTaskPoller<void, boolean>({
        pollInterval,
        work,
        getCapacity: () => (hasCapacity ? 1 : 0),
        pollRequests$: new Subject<Option<void>>(),
      }).subscribe(() => {});

      expect(work).toHaveBeenCalledTimes(0);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(1);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      hasCapacity = false;

      await sleep(0);
      advance(pollInterval);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      hasCapacity = true;

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(4);
    })
  );

  test(
    'requests with no arguments (nudge requests) are queued on-demand in between intervals',
    fakeSchedulers(async advance => {
      const pollInterval = 100;
      const querterInterval = Math.floor(pollInterval / 4);
      const halfInterval = querterInterval * 2;

      const work = jest.fn(async () => true);
      const pollRequests$ = new Subject<Option<void>>();
      createTaskPoller<void, boolean>({
        pollInterval,
        work,
        getCapacity: () => 1,
        pollRequests$,
      }).subscribe(jest.fn());

      expect(work).toHaveBeenCalledTimes(0);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(1);

      advance(querterInterval);
      await sleep(0);
      expect(work).toHaveBeenCalledTimes(1);

      pollRequests$.next(none);

      expect(work).toHaveBeenCalledTimes(2);
      expect(work).toHaveBeenNthCalledWith(2);

      await sleep(0);
      advance(querterInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(halfInterval);
      expect(work).toHaveBeenCalledTimes(3);
    })
  );

  test(
    'requests with no arguments (nudge requests) are dropped when there is no capacity',
    fakeSchedulers(async advance => {
      const pollInterval = 100;
      const querterInterval = Math.floor(pollInterval / 4);
      const halfInterval = querterInterval * 2;

      let hasCapacity = true;
      const work = jest.fn(async () => true);
      const pollRequests$ = new Subject<Option<void>>();
      createTaskPoller<void, boolean>({
        pollInterval,
        work,
        getCapacity: () => (hasCapacity ? 1 : 0),
        pollRequests$,
      }).subscribe(() => {});

      expect(work).toHaveBeenCalledTimes(0);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(1);
      hasCapacity = false;

      await sleep(0);
      advance(querterInterval);

      pollRequests$.next(none);

      expect(work).toHaveBeenCalledTimes(1);

      await sleep(0);
      advance(querterInterval);

      hasCapacity = true;
      advance(halfInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);
    })
  );

  test(
    'requests with arguments are emitted',
    fakeSchedulers(async advance => {
      const pollInterval = 100;

      const work = jest.fn(async () => true);
      const pollRequests$ = new Subject<Option<string>>();
      createTaskPoller<string, boolean>({
        pollInterval,
        work,
        getCapacity: () => 1,
        pollRequests$,
      }).subscribe(() => {});

      advance(pollInterval);

      pollRequests$.next(some('one'));

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledWith('one');

      pollRequests$.next(some('two'));

      await sleep(0);
      advance(pollInterval);

      expect(work).toHaveBeenCalledWith('two');
    })
  );

  test(
    'waits for work to complete before emitting the next event',
    fakeSchedulers(async advance => {
      const pollInterval = 100;

      const worker = resolvable();

      const handler = jest.fn();
      const pollRequests$ = new Subject<Option<string>>();
      createTaskPoller<string, string[]>({
        pollInterval,
        work: async (...args) => {
          await worker;
          return args;
        },
        getCapacity: () => 5,
        pollRequests$,
      }).subscribe(handler);

      pollRequests$.next(some('one'));

      advance(pollInterval);

      // work should now be in progress
      pollRequests$.next(none);
      pollRequests$.next(some('two'));
      pollRequests$.next(some('three'));

      advance(pollInterval);
      await sleep(pollInterval);

      expect(handler).toHaveBeenCalledTimes(0);

      worker.resolve();

      advance(pollInterval);
      await sleep(pollInterval);

      expect(handler).toHaveBeenCalledWith(asOk(['one']));

      advance(pollInterval);

      expect(handler).toHaveBeenCalledWith(asOk(['two', 'three']));
    })
  );

  test(
    'returns an error when polling for work fails',
    fakeSchedulers(async advance => {
      const pollInterval = 100;

      const handler = jest.fn();
      const pollRequests$ = new Subject<Option<string>>();
      createTaskPoller<string, string[]>({
        pollInterval,
        work: async (...args) => {
          throw new Error('failed to work');
        },
        getCapacity: () => 5,
        pollRequests$,
      }).subscribe(handler);

      advance(pollInterval);
      await sleep(0);

      expect(handler).toHaveBeenCalledWith(asErr('Failed to poll for work: Error: failed to work'));
    })
  );
});

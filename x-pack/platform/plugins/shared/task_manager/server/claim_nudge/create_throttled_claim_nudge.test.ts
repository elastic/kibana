/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { BehaviorSubject, Subject, take } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createThrottledClaimNudge } from './create_throttled_claim_nudge';

describe('createThrottledClaimNudge', () => {
  let clock: sinon.SinonFakeTimers;
  let claimNudge$: Subject<void>;
  let claimCycleStart$: Subject<void>;
  let backpressure$: BehaviorSubject<boolean>;
  let deliveryTimes: number[];

  const createNudges = () =>
    createThrottledClaimNudge({
      claimNudge$,
      claimCycleStart$,
      backpressure$,
      logger: loggingSystemMock.createLogger(),
    });

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    claimNudge$ = new Subject<void>();
    claimCycleStart$ = new Subject<void>();
    backpressure$ = new BehaviorSubject(false);
    deliveryTimes = [];
  });

  afterEach(() => {
    claimNudge$.complete();
    claimCycleStart$.complete();
    backpressure$.complete();
    clock.restore();
  });

  const recordNudge = () => deliveryTimes.push(Date.now());

  test('delivers the first nudge immediately without an automatic follow-up', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0]);
    clock.tick(3000);
    expect(deliveryTimes).toEqual([0]);
  });

  test('coalesces additional nudges into one trailing nudge during slow polling', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    clock.tick(299);
    expect(deliveryTimes).toEqual([0]);
    clock.tick(1);
    expect(deliveryTimes).toEqual([0, 500]);
    clock.tick(3000);
    expect(deliveryTimes).toEqual([0, 500]);
  });

  test.each([250, 500])('a regular cycle at %ims consumes the pending nudge', (interval) => {
    // Scheduled before the throttle timer so the 500ms case also covers a tie.
    setTimeout(() => claimCycleStart$.next(), interval);
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    clock.tick(400);
    expect(deliveryTimes).toEqual([0]);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0, 500]);
  });

  test('keeps a fixed 500ms budget during sustained nudges, including after trailing emissions', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    for (let notification = 0; notification < 20; notification++) {
      clock.tick(100);
      claimNudge$.next();
    }
    expect(deliveryTimes).toEqual([0, 500, 1000, 1500, 2000]);
    clock.tick(500);
    expect(deliveryTimes).toEqual([0, 500, 1000, 1500, 2000, 2500]);
    clock.tick(3000);
    expect(deliveryTimes).toEqual([0, 500, 1000, 1500, 2000, 2500]);
  });

  test('drops the trailing nudge and cleans up when the source completes', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    clock.tick(300);
    claimNudge$.complete();
    clock.tick(100);
    expect(deliveryTimes).toEqual([0]);
    expect(clock.countTimers()).toBe(0);
    expect(backpressure$.observed).toBe(false);
    expect(claimCycleStart$.observed).toBe(false);
    clock.tick(3000);
    expect(deliveryTimes).toEqual([0]);
  });

  test('drops the trailing nudge and cleans up when the source errors', () => {
    const onError = jest.fn();
    const error = new Error('nudge source failed');
    createNudges().subscribe({ next: recordNudge, error: onError });
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    clock.tick(300);
    claimNudge$.error(error);
    clock.tick(100);
    expect(deliveryTimes).toEqual([0]);
    expect(onError).toHaveBeenCalledWith(error);
    expect(clock.countTimers()).toBe(0);
    expect(backpressure$.observed).toBe(false);
    expect(claimCycleStart$.observed).toBe(false);
  });

  test('does not postpone the trailing deadline when more nudges arrive', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    clock.tick(399);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0]);
    clock.tick(1);
    expect(deliveryTimes).toEqual([0, 500]);
  });

  test('discards pending work on backpressure even if it clears before delivery', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    backpressure$.next(true);
    clock.tick(100);
    claimNudge$.next();
    backpressure$.next(false);
    clock.tick(300);
    expect(deliveryTimes).toEqual([0]);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0, 500]);
  });

  test('a new claim covers pending signals without reopening the throttle early', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    clock.tick(100);
    claimCycleStart$.next();
    clock.tick(300);
    expect(deliveryTimes).toEqual([0]);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0, 500]);
  });

  test('retains signals received after a claim starts for a trailing follow-up', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    clock.tick(100);
    claimCycleStart$.next();
    clock.tick(100);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0]);
    clock.tick(200);
    expect(deliveryTimes).toEqual([0, 500]);
  });

  test('suppresses both edges during backpressure without consuming a recovery window', () => {
    createNudges().subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    backpressure$.next(true);
    clock.tick(500);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0]);
    clock.tick(1);
    backpressure$.next(false);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0, 601]);
  });

  test('cancels a pending trailing nudge and releases observers on unsubscribe', () => {
    const nudges$ = createNudges();
    const subscription = nudges$.subscribe(recordNudge);
    claimNudge$.next();
    clock.tick(100);
    claimNudge$.next();
    subscription.unsubscribe();
    expect(clock.countTimers()).toBe(0);
    expect(claimNudge$.observed).toBe(false);
    expect(backpressure$.observed).toBe(false);
    expect(claimCycleStart$.observed).toBe(false);
    clock.tick(400);
    expect(deliveryTimes).toEqual([0]);
    nudges$.subscribe(recordNudge);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0, 500]);
  });

  test('cleans up if unsubscribed while delivering the leading nudge', () => {
    createNudges().pipe(take(1)).subscribe(recordNudge);
    claimNudge$.next();
    expect(deliveryTimes).toEqual([0]);
    expect(clock.countTimers()).toBe(0);
    expect(claimNudge$.observed).toBe(false);
    expect(backpressure$.observed).toBe(false);
    expect(claimCycleStart$.observed).toBe(false);
  });
});

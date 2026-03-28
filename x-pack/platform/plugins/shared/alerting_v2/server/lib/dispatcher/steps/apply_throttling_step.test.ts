/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyThrottling } from './apply_throttling_step';
import { createNotificationGroup, createNotificationPolicy } from '../fixtures/test_utils';

describe('applyThrottling', () => {
  it('dispatches group when no previous notification exists', () => {
    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1', throttle: { interval: '1h' } });

    const { dispatch, throttled } = applyThrottling(
      [group],
      new Map([['p1', policy]]),
      new Map(),
      new Date('2026-01-22T10:00:00.000Z')
    );

    expect(dispatch).toHaveLength(1);
    expect(throttled).toHaveLength(0);
  });

  it('throttles group when last notified within interval', () => {
    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1', throttle: { interval: '1h' } });

    const { dispatch, throttled } = applyThrottling(
      [group],
      new Map([['p1', policy]]),
      new Map([['g1', new Date('2026-01-22T09:30:00.000Z')]]),
      new Date('2026-01-22T10:00:00.000Z')
    );

    expect(dispatch).toHaveLength(0);
    expect(throttled).toHaveLength(1);
  });

  it('dispatches group when last notified outside interval', () => {
    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1', throttle: { interval: '1h' } });

    const { dispatch, throttled } = applyThrottling(
      [group],
      new Map([['p1', policy]]),
      new Map([['g1', new Date('2026-01-22T08:00:00.000Z')]]),
      new Date('2026-01-22T10:00:00.000Z')
    );

    expect(dispatch).toHaveLength(1);
    expect(throttled).toHaveLength(0);
  });

  it('dispatches group when policy has no throttle', () => {
    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1' });

    const { dispatch, throttled } = applyThrottling(
      [group],
      new Map([['p1', policy]]),
      new Map([['g1', new Date('2026-01-22T09:59:00.000Z')]]),
      new Date('2026-01-22T10:00:00.000Z')
    );

    expect(dispatch).toHaveLength(1);
    expect(throttled).toHaveLength(0);
  });

  it('handles mixed dispatch and throttle across groups', () => {
    const g1 = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const g2 = createNotificationGroup({ id: 'g2', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1', throttle: { interval: '1h' } });

    const { dispatch, throttled } = applyThrottling(
      [g1, g2],
      new Map([['p1', policy]]),
      new Map([['g1', new Date('2026-01-22T09:30:00.000Z')]]),
      new Date('2026-01-22T10:00:00.000Z')
    );

    expect(dispatch).toHaveLength(1);
    expect(dispatch[0].id).toBe('g2');
    expect(throttled).toHaveLength(1);
    expect(throttled[0].id).toBe('g1');
  });

  it('returns empty arrays when no groups', () => {
    const { dispatch, throttled } = applyThrottling([], new Map(), new Map(), new Date());

    expect(dispatch).toHaveLength(0);
    expect(throttled).toHaveLength(0);
  });
});

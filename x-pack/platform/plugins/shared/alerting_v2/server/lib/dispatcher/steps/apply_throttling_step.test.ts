/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyThrottling } from './apply_throttling_step';
import {
  createAlertEpisode,
  createNotificationGroup,
  createNotificationPolicy,
} from '../fixtures/test_utils';
import type { NotificationGroupId, LastNotifiedInfo } from '../types';

const NOW = new Date('2026-01-22T10:00:00.000Z');

const info = (lastNotified: string, episodeStatus?: string): LastNotifiedInfo => ({
  lastNotified: new Date(lastNotified),
  episodeStatus,
});

describe('applyThrottling', () => {
  describe('per_episode + on_status_change', () => {
    const basePolicy = createNotificationPolicy({
      id: 'p1',
      groupingMode: 'per_episode',
      throttle: { strategy: 'on_status_change' },
    });

    it('dispatches when no previous notification exists', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches when status changed', () => {
      const group = createNotificationGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'recovering' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:59:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('throttles when status unchanged', () => {
      const group = createNotificationGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:59:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(1);
    });
  });

  describe('per_episode + per_status_interval', () => {
    const basePolicy = createNotificationPolicy({
      id: 'p1',
      groupingMode: 'per_episode',
      throttle: { strategy: 'per_status_interval', interval: '1h' },
    });

    it('dispatches when no previous notification exists', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches when status changed', () => {
      const group = createNotificationGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'recovering' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:59:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches when status unchanged and interval expired', () => {
      const group = createNotificationGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T08:00:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('throttles when status unchanged and within interval', () => {
      const group = createNotificationGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:30:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(1);
    });
  });

  describe('per_episode + every_time', () => {
    const basePolicy = createNotificationPolicy({
      id: 'p1',
      groupingMode: 'per_episode',
      throttle: { strategy: 'every_time' },
    });

    it('dispatches when no previous notification exists', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches even with recent notification', () => {
      const group = createNotificationGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:59:59.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('per_field + time_interval', () => {
    const basePolicy = createNotificationPolicy({
      id: 'p1',
      groupingMode: 'per_field',
      groupBy: ['host.name'],
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    it('dispatches when no previous notification exists', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches when interval expired', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:50:00.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('throttles when within interval', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:58:00.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(1);
    });

    it('dispatches when no interval configured', () => {
      const policy = createNotificationPolicy({
        id: 'p1',
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttle: { strategy: 'time_interval' },
      });
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', policy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:59:59.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('per_field + every_time', () => {
    const basePolicy = createNotificationPolicy({
      id: 'p1',
      groupingMode: 'per_field',
      groupBy: ['host.name'],
      throttle: { strategy: 'every_time' },
    });

    it('dispatches when no previous notification exists', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches even with recent notification', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:59:59.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('all + time_interval', () => {
    const basePolicy = createNotificationPolicy({
      id: 'p1',
      groupingMode: 'all',
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    it('dispatches when no previous notification exists', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches when interval expired', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:50:00.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('throttles when within interval', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:58:00.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(1);
    });

    it('dispatches when no interval configured', () => {
      const policy = createNotificationPolicy({
        id: 'p1',
        groupingMode: 'all',
        throttle: { strategy: 'time_interval' },
      });
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', policy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:59:59.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('all + every_time', () => {
    const basePolicy = createNotificationPolicy({
      id: 'p1',
      groupingMode: 'all',
      throttle: { strategy: 'every_time' },
    });

    it('dispatches when no previous notification exists', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches even with recent notification', () => {
      const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:59:59.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('mixed groups', () => {
    it('handles mixed dispatch and throttle across groups', () => {
      const g1 = createNotificationGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });
      const g2 = createNotificationGroup({
        id: 'g2',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'recovering' })],
      });
      const policy = createNotificationPolicy({
        id: 'p1',
        throttle: { strategy: 'on_status_change' },
      });

      const { dispatch, throttled } = applyThrottling(
        [g1, g2],
        new Map([['p1', policy]]),
        new Map<NotificationGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:30:00.000Z', 'active')],
          ['g2', info('2026-01-22T09:30:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(dispatch[0].id).toBe('g2');
      expect(throttled).toHaveLength(1);
      expect(throttled[0].id).toBe('g1');
    });

    it('returns empty arrays when no groups', () => {
      const { dispatch, throttled } = applyThrottling([], new Map(), new Map(), NOW);

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(0);
    });
  });
});

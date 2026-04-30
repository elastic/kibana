/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplyThrottlingStep, applyThrottling } from './apply_throttling_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createLastNotifiedTimestampsResponse } from '../fixtures/dispatcher';
import {
  createAlertEpisode,
  createActionGroup,
  createActionPolicy,
  createDispatcherPipelineState,
} from '../fixtures/test_utils';
import type { ActionGroupId, LastNotifiedInfo } from '../types';

const NOW = new Date('2026-01-22T10:00:00.000Z');

const info = (lastNotified: string, episodeStatus?: string): LastNotifiedInfo => ({
  lastNotified: new Date(lastNotified),
  episodeStatus,
});

describe('applyThrottling', () => {
  describe('per_episode + on_status_change', () => {
    const basePolicy = createActionPolicy({
      id: 'p1',
      groupingMode: 'per_episode',
      throttle: { strategy: 'on_status_change' },
    });

    it('dispatches when no previous action exists', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

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
      const group = createActionGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'recovering' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:59:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('throttles when status unchanged', () => {
      const group = createActionGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:59:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(1);
    });
  });

  describe('per_episode + per_status_interval', () => {
    const basePolicy = createActionPolicy({
      id: 'p1',
      groupingMode: 'per_episode',
      throttle: { strategy: 'per_status_interval', interval: '1h' },
    });

    it('dispatches when no previous action exists', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

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
      const group = createActionGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'recovering' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:59:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches when status unchanged and interval expired', () => {
      const group = createActionGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T08:00:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('throttles when status unchanged and within interval', () => {
      const group = createActionGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:30:00.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(1);
    });
  });

  describe('per_episode + every_time', () => {
    const basePolicy = createActionPolicy({
      id: 'p1',
      groupingMode: 'per_episode',
      throttle: { strategy: 'every_time' },
    });

    it('dispatches when no previous action exists', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches even with recent action', () => {
      const group = createActionGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([
          ['g1', info('2026-01-22T09:59:59.000Z', 'active')],
        ]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('per_field + time_interval', () => {
    const basePolicy = createActionPolicy({
      id: 'p1',
      groupingMode: 'per_field',
      groupBy: ['host.name'],
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    it('dispatches when no previous action exists', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

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
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:50:00.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('throttles when within interval', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:58:00.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(1);
    });

    it('dispatches when no interval configured', () => {
      const policy = createActionPolicy({
        id: 'p1',
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttle: { strategy: 'time_interval' },
      });
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', policy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:59:59.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('per_field + every_time', () => {
    const basePolicy = createActionPolicy({
      id: 'p1',
      groupingMode: 'per_field',
      groupBy: ['host.name'],
      throttle: { strategy: 'every_time' },
    });

    it('dispatches when no previous action exists', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches even with recent action', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:59:59.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('all + time_interval', () => {
    const basePolicy = createActionPolicy({
      id: 'p1',
      groupingMode: 'all',
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    it('dispatches when no previous action exists', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

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
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:50:00.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('throttles when within interval', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:58:00.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(0);
      expect(throttled).toHaveLength(1);
    });

    it('dispatches when no interval configured', () => {
      const policy = createActionPolicy({
        id: 'p1',
        groupingMode: 'all',
        throttle: { strategy: 'time_interval' },
      });
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', policy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:59:59.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('all + every_time', () => {
    const basePolicy = createActionPolicy({
      id: 'p1',
      groupingMode: 'all',
      throttle: { strategy: 'every_time' },
    });

    it('dispatches when no previous action exists', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map(),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });

    it('dispatches even with recent action', () => {
      const group = createActionGroup({ id: 'g1', policyId: 'p1' });

      const { dispatch, throttled } = applyThrottling(
        [group],
        new Map([['p1', basePolicy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([['g1', info('2026-01-22T09:59:59.000Z')]]),
        NOW
      );

      expect(dispatch).toHaveLength(1);
      expect(throttled).toHaveLength(0);
    });
  });

  describe('mixed groups', () => {
    it('handles mixed dispatch and throttle across groups', () => {
      const g1 = createActionGroup({
        id: 'g1',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'active' })],
      });
      const g2 = createActionGroup({
        id: 'g2',
        policyId: 'p1',
        episodes: [createAlertEpisode({ episode_status: 'recovering' })],
      });
      const policy = createActionPolicy({
        id: 'p1',
        throttle: { strategy: 'on_status_change' },
      });

      const { dispatch, throttled } = applyThrottling(
        [g1, g2],
        new Map([['p1', policy]]),
        new Map<ActionGroupId, LastNotifiedInfo>([
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

describe('ApplyThrottlingStep', () => {
  it('issues multiple ES|QL requests and concatenates results when input exceeds the size budget', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new ApplyThrottlingStep(queryService, loggerService);

    const longSegment = 'q'.repeat(10_000);
    const groups = Array.from({ length: 200 }, (_, i) =>
      createActionGroup({ id: `${longSegment}-g${i}`, policyId: 'p1' })
    );
    const policies = new Map([
      ['p1', createActionPolicy({ id: 'p1', throttle: { strategy: 'every_time' } })],
    ]);

    const firstId = groups[0].id;
    const lastId = groups[groups.length - 1].id;

    // A chunk that contains firstId returns its row, the chunk that contains
    // lastId returns its row, every other chunk returns an empty result.
    mockEsClient.esql.query.mockImplementation((args: { query: string }) => {
      const rows: Array<{ action_group_id: string; last_notified: string }> = [];
      if (args.query.includes(firstId)) {
        rows.push({ action_group_id: firstId, last_notified: '2026-01-22T08:00:00.000Z' });
      }
      if (args.query.includes(lastId)) {
        rows.push({ action_group_id: lastId, last_notified: '2026-01-22T08:00:00.000Z' });
      }
      return Promise.resolve(createLastNotifiedTimestampsResponse(rows));
    });

    const state = createDispatcherPipelineState({ groups, policies });
    const result = await step.execute(state);

    expect(mockEsClient.esql.query.mock.calls.length).toBeGreaterThanOrEqual(2);
    for (const [args] of mockEsClient.esql.query.mock.calls) {
      expect((args.query as string).length).toBeLessThan(1_000_000);
    }

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    // every_time strategy → all groups dispatch regardless of last_notified.
    expect(result.data?.dispatch).toHaveLength(200);
    expect(result.data?.throttled).toHaveLength(0);
  });

  it('returns empty dispatch and throttled when no groups', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new ApplyThrottlingStep(queryService, loggerService);

    const result = await step.execute(createDispatcherPipelineState({ groups: [] }));

    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.dispatch).toHaveLength(0);
    expect(result.data?.throttled).toHaveLength(0);
  });
});

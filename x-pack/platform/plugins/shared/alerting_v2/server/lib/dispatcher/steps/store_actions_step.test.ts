/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StoreActionsStep } from './store_actions_step';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import {
  ALERT_ACTIONS_DATA_STREAM,
  type AlertAction,
} from '../../../resources/datastreams/alert_actions';
import {
  createDispatcherPipelineState,
  createAlertEpisode,
  createActionGroup,
  createActionPolicy,
  createRule,
} from '../fixtures/test_utils';

const createMockStorageService = (): jest.Mocked<StorageServiceContract> => ({
  bulkIndexDocs: jest.fn().mockResolvedValue(undefined),
});

const createRules = (...ids: string[]) => new Map(ids.map((id) => [id, createRule({ id })]));

describe('StoreActionsStep', () => {
  const mockDate = new Date('2026-01-22T08:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('halts when there are no episodes at all', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const state = createDispatcherPipelineState({
      dispatchable: [],
      suppressed: [],
      throttled: [],
      dispatch: [],
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'no_actions' });
    expect(mockService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('halts when suppressed, throttled, and dispatch are all empty', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const state = createDispatcherPipelineState({
      suppressed: [],
      throttled: [],
      dispatch: [],
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'no_actions' });
    expect(mockService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('halts when suppressed, throttled, and dispatch are undefined', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const state = createDispatcherPipelineState({});

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'no_actions' });
    expect(mockService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('records suppressed episodes with action_type suppress', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const state = createDispatcherPipelineState({
      suppressed: [{ ...episode, reason: 'user acknowledged' }],
      throttled: [],
      dispatch: [],
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);
    expect(mockService.bulkIndexDocs).toHaveBeenCalledWith({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [
        {
          '@timestamp': mockDate.toISOString(),
          group_hash: 'hash-1',
          last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
          actor: 'system',
          action_type: 'suppress',
          rule_id: 'rule-1',
          source: 'internal',
          reason: 'user acknowledged',
          space_id: 'default',
        },
      ],
    });
  });

  it('records throttled notification groups with throttle-specific reason', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      episodes: [episode],
    });

    const state = createDispatcherPipelineState({
      suppressed: [],
      throttled: [group],
      dispatch: [],
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);
    expect(mockService.bulkIndexDocs).toHaveBeenCalledWith({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [
        {
          '@timestamp': mockDate.toISOString(),
          group_hash: 'hash-1',
          last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
          actor: 'system',
          action_type: 'suppress',
          rule_id: 'rule-1',
          source: 'internal',
          reason: 'suppressed by throttled policy policy-1',
          space_id: 'default',
        },
      ],
    });
  });

  it('records dispatched episodes with fire and notified actions', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      episodes: [episode],
    });

    const state = createDispatcherPipelineState({
      suppressed: [],
      throttled: [],
      dispatch: [group],
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);
    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.docs).toHaveLength(2);
    expect(callArgs.docs[0]).toEqual({
      '@timestamp': mockDate.toISOString(),
      group_hash: 'hash-1',
      last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
      actor: 'system',
      action_type: 'fire',
      rule_id: 'rule-1',
      source: 'internal',
      reason: 'dispatched by policy policy-1',
      space_id: 'default',
    });
    expect(callArgs.docs[1]).toEqual({
      '@timestamp': mockDate.toISOString(),
      actor: 'system',
      action_type: 'notified',
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_series_event_timestamp: mockDate.toISOString(),
      action_group_id: 'group-1',
      source: 'internal',
      reason: 'notified by policy policy-1',
      episode_status: 'active',
      space_id: 'default',
    });
  });

  it('includes episode_status on notified record for per_episode mode', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      episode_status: 'recovering',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      episodes: [episode],
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([
        ['policy-1', createActionPolicy({ id: 'policy-1', throttle: { interval: '1h' } })],
      ]),
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);
    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    const notifiedDoc = callArgs.docs.find(
      (d: Record<string, unknown>) => d.action_type === 'notified'
    );
    expect(notifiedDoc).toEqual(
      expect.objectContaining({
        action_type: 'notified',
        group_hash: 'hash-1',
        action_group_id: 'group-1',
        episode_status: 'recovering',
        reason: 'notified by policy policy-1',
        space_id: 'default',
      })
    );
  });

  it('omits episode_status on notified record for all mode', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      episodes: [episode],
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([
        [
          'policy-1',
          createActionPolicy({
            id: 'policy-1',
            groupingMode: 'all',
            throttle: { strategy: 'time_interval', interval: '5m' },
          }),
        ],
      ]),
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    const notifiedDoc = callArgs.docs.find(
      (d: Record<string, unknown>) => d.action_type === 'notified'
    );
    expect(notifiedDoc).toBeDefined();
    expect(notifiedDoc?.episode_status).toBeUndefined();
  });

  it('handles combined suppressed, throttled, and dispatch arrays', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const suppressedEpisode = createAlertEpisode({
      rule_id: 'rule-suppressed',
      group_hash: 'hash-suppressed',
      episode_id: 'ep-suppressed',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const throttledEpisode = createAlertEpisode({
      rule_id: 'rule-throttled',
      group_hash: 'hash-throttled',
      episode_id: 'ep-throttled',
      last_event_timestamp: '2026-01-22T07:10:00.000Z',
    });

    const dispatchEpisode = createAlertEpisode({
      rule_id: 'rule-dispatch',
      group_hash: 'hash-dispatch',
      episode_id: 'ep-dispatch',
      last_event_timestamp: '2026-01-22T07:20:00.000Z',
    });

    const throttledGroup = createActionGroup({
      id: 'throttled-group',
      policyId: 'throttle-policy',
      episodes: [throttledEpisode],
    });

    const dispatchGroup = createActionGroup({
      id: 'dispatch-group',
      policyId: 'dispatch-policy',
      episodes: [dispatchEpisode],
    });

    const state = createDispatcherPipelineState({
      suppressed: [{ ...suppressedEpisode, reason: 'manually suppressed' }],
      throttled: [throttledGroup],
      dispatch: [dispatchGroup],
      policies: new Map([
        [
          'dispatch-policy',
          createActionPolicy({ id: 'dispatch-policy', throttle: { interval: '1h' } }),
        ],
      ]),
      rules: createRules('rule-suppressed', 'rule-throttled', 'rule-dispatch'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.index).toBe(ALERT_ACTIONS_DATA_STREAM);
    expect(callArgs.docs).toHaveLength(4);

    expect(callArgs.docs[0]).toEqual({
      '@timestamp': mockDate.toISOString(),
      group_hash: 'hash-suppressed',
      last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
      actor: 'system',
      action_type: 'suppress',
      rule_id: 'rule-suppressed',
      source: 'internal',
      reason: 'manually suppressed',
      space_id: 'default',
    });

    expect(callArgs.docs[1]).toEqual({
      '@timestamp': mockDate.toISOString(),
      group_hash: 'hash-throttled',
      last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
      actor: 'system',
      action_type: 'suppress',
      rule_id: 'rule-throttled',
      source: 'internal',
      reason: 'suppressed by throttled policy throttle-policy',
      space_id: 'default',
    });

    expect(callArgs.docs[2]).toEqual({
      '@timestamp': mockDate.toISOString(),
      group_hash: 'hash-dispatch',
      last_series_event_timestamp: '2026-01-22T07:20:00.000Z',
      actor: 'system',
      action_type: 'fire',
      rule_id: 'rule-dispatch',
      source: 'internal',
      reason: 'dispatched by policy dispatch-policy',
      space_id: 'default',
    });

    expect(callArgs.docs[3]).toEqual(
      expect.objectContaining({
        action_type: 'notified',
        rule_id: 'rule-dispatch',
        group_hash: 'hash-dispatch',
        action_group_id: 'dispatch-group',
        episode_status: 'active',
        reason: 'notified by policy dispatch-policy',
        space_id: 'default',
      })
    );
  });

  it('records unmatched episodes with action_type unmatched', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const unmatchedEpisode = createAlertEpisode({
      rule_id: 'rule-unmatched',
      group_hash: 'hash-unmatched',
      episode_id: 'ep-unmatched',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const state = createDispatcherPipelineState({
      dispatchable: [unmatchedEpisode],
      suppressed: [],
      throttled: [],
      dispatch: [],
      rules: createRules('rule-unmatched'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);
    expect(mockService.bulkIndexDocs).toHaveBeenCalledWith({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [
        {
          '@timestamp': mockDate.toISOString(),
          group_hash: 'hash-unmatched',
          last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
          actor: 'system',
          action_type: 'unmatched',
          rule_id: 'rule-unmatched',
          source: 'internal',
          reason: 'no matching action policy',
          space_id: 'default',
        },
      ],
    });
  });

  it('does not halt when only unmatched episodes exist', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode1 = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      episode_id: 'ep-1',
    });

    const episode2 = createAlertEpisode({
      rule_id: 'rule-2',
      group_hash: 'hash-2',
      episode_id: 'ep-2',
    });

    const state = createDispatcherPipelineState({
      dispatchable: [episode1, episode2],
      suppressed: [],
      throttled: [],
      dispatch: [],
      rules: createRules('rule-1', 'rule-2'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.docs).toHaveLength(2);
    expect(callArgs.docs[0].action_type).toBe('unmatched');
    expect(callArgs.docs[1].action_type).toBe('unmatched');
  });

  it('records unmatched episodes alongside dispatched and throttled groups', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const dispatchedEpisode = createAlertEpisode({
      rule_id: 'rule-dispatch',
      group_hash: 'hash-dispatch',
      episode_id: 'ep-dispatch',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const throttledEpisode = createAlertEpisode({
      rule_id: 'rule-throttled',
      group_hash: 'hash-throttled',
      episode_id: 'ep-throttled',
      last_event_timestamp: '2026-01-22T07:05:00.000Z',
    });

    const unmatchedEpisode = createAlertEpisode({
      rule_id: 'rule-unmatched',
      group_hash: 'hash-unmatched',
      episode_id: 'ep-unmatched',
      last_event_timestamp: '2026-01-22T07:10:00.000Z',
    });

    const dispatchGroup = createActionGroup({
      id: 'dispatch-group',
      policyId: 'dispatch-policy',
      episodes: [dispatchedEpisode],
    });

    const throttledGroup = createActionGroup({
      id: 'throttled-group',
      policyId: 'throttle-policy',
      episodes: [throttledEpisode],
    });

    const state = createDispatcherPipelineState({
      dispatchable: [dispatchedEpisode, throttledEpisode, unmatchedEpisode],
      suppressed: [],
      throttled: [throttledGroup],
      dispatch: [dispatchGroup],
      rules: createRules('rule-dispatch', 'rule-throttled', 'rule-unmatched'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    const actionTypes = callArgs.docs.map(
      (d: Record<string, unknown>) => d.action_type as AlertAction['action_type']
    );
    expect(actionTypes).toContain('suppress');
    expect(actionTypes).toContain('fire');
    expect(actionTypes).toContain('unmatched');

    const noActionDocs = callArgs.docs.filter(
      (d: Record<string, unknown>) => d.action_type === 'unmatched'
    );
    expect(noActionDocs).toHaveLength(1);
    expect(noActionDocs[0]).toEqual({
      '@timestamp': mockDate.toISOString(),
      group_hash: 'hash-unmatched',
      last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
      actor: 'system',
      action_type: 'unmatched',
      rule_id: 'rule-unmatched',
      source: 'internal',
      reason: 'no matching action policy',
      space_id: 'default',
    });
  });

  it('records multiple episodes within a single dispatch group', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode1 = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      episode_id: 'ep-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const episode2 = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-2',
      episode_id: 'ep-2',
      last_event_timestamp: '2026-01-22T07:05:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      episodes: [episode1, episode2],
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.docs).toHaveLength(3);
    expect(callArgs.docs[0].action_type).toBe('fire');
    expect(callArgs.docs[0].group_hash).toBe('hash-1');
    expect(callArgs.docs[1].action_type).toBe('fire');
    expect(callArgs.docs[1].group_hash).toBe('hash-2');
    expect(callArgs.docs[2].action_type).toBe('notified');
    expect(callArgs.docs[2].group_hash).toBe('hash-1');
  });

  describe('space_id resolution', () => {
    it('uses the space_id from the rules map for each episode', async () => {
      const mockService = createMockStorageService();
      const step = new StoreActionsStep(mockService);

      const episode = createAlertEpisode({
        rule_id: 'rule-in-custom-space',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...episode, reason: 'suppressed' }],
        rules: new Map([
          ['rule-in-custom-space', createRule({ id: 'rule-in-custom-space', spaceId: 'custom' })],
        ]),
      });

      await step.execute(state);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('custom');
    });

    it('defaults space_id to "default" when rule is not found in the rules map', async () => {
      const mockService = createMockStorageService();
      const step = new StoreActionsStep(mockService);

      const episode = createAlertEpisode({
        rule_id: 'unknown-rule',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...episode, reason: 'suppressed' }],
        rules: createRules('other-rule'),
      });

      await step.execute(state);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('default');
    });

    it('defaults space_id to "default" when rules map is undefined', async () => {
      const mockService = createMockStorageService();
      const step = new StoreActionsStep(mockService);

      const episode = createAlertEpisode({
        rule_id: 'rule-1',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...episode, reason: 'suppressed' }],
      });

      await step.execute(state);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('default');
    });

    it('resolves different space_id for episodes from rules in different spaces', async () => {
      const mockService = createMockStorageService();
      const step = new StoreActionsStep(mockService);

      const episode1 = createAlertEpisode({
        rule_id: 'rule-space-a',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const episode2 = createAlertEpisode({
        rule_id: 'rule-space-b',
        group_hash: 'hash-2',
        last_event_timestamp: '2026-01-22T07:05:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [
          { ...episode1, reason: 'suppressed' },
          { ...episode2, reason: 'suppressed' },
        ],
        rules: new Map([
          ['rule-space-a', createRule({ id: 'rule-space-a', spaceId: 'space-a' })],
          ['rule-space-b', createRule({ id: 'rule-space-b', spaceId: 'space-b' })],
        ]),
      });

      await step.execute(state);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('space-a');
      expect(callArgs.docs[1].space_id).toBe('space-b');
    });
  });
});

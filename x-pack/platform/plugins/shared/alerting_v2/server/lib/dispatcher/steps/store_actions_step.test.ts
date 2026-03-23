/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StoreActionsStep } from './store_actions_step';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import { ALERT_ACTIONS_DATA_STREAM, type AlertAction } from '../../../resources/alert_actions';
import {
  createDispatcherPipelineState,
  createAlertEpisode,
  createNotificationGroup,
  createNotificationPolicy,
} from '../fixtures/test_utils';

const createMockStorageService = (): jest.Mocked<StorageServiceContract> => ({
  bulkIndexDocs: jest.fn().mockResolvedValue(undefined),
});

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

    const group = createNotificationGroup({
      id: 'group-1',
      policyId: 'policy-1',
      episodes: [episode],
    });

    const state = createDispatcherPipelineState({
      suppressed: [],
      throttled: [group],
      dispatch: [],
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
        },
      ],
    });
  });

  it('records dispatched episodes with fire action type when policy has no throttle interval', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createNotificationGroup({
      id: 'group-1',
      ruleId: 'rule-1',
      policyId: 'policy-1',
      episodes: [episode],
    });

    const state = createDispatcherPipelineState({
      suppressed: [],
      throttled: [],
      dispatch: [group],
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
          action_type: 'fire',
          rule_id: 'rule-1',
          source: 'internal',
          reason: 'dispatched by policy policy-1',
        },
      ],
    });
  });

  it('records notified action when dispatch policy has a throttle interval', async () => {
    const mockService = createMockStorageService();
    const step = new StoreActionsStep(mockService);

    const episode = createAlertEpisode({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createNotificationGroup({
      id: 'group-1',
      ruleId: 'rule-1',
      policyId: 'policy-1',
      episodes: [episode],
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([
        ['policy-1', createNotificationPolicy({ id: 'policy-1', throttle: { interval: '1h' } })],
      ]),
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
          action_type: 'fire',
          rule_id: 'rule-1',
          source: 'internal',
          reason: 'dispatched by policy policy-1',
        },
        {
          '@timestamp': mockDate.toISOString(),
          actor: 'system',
          action_type: 'notified',
          rule_id: 'rule-1',
          group_hash: 'irrelevant',
          last_series_event_timestamp: mockDate.toISOString(),
          notification_group_id: 'group-1',
          source: 'internal',
          reason: 'notified by policy policy-1 with throttle interval',
        },
      ],
    });
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

    const throttledGroup = createNotificationGroup({
      id: 'throttled-group',
      policyId: 'throttle-policy',
      episodes: [throttledEpisode],
    });

    const dispatchGroup = createNotificationGroup({
      id: 'dispatch-group',
      ruleId: 'rule-dispatch',
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
          createNotificationPolicy({ id: 'dispatch-policy', throttle: { interval: '1h' } }),
        ],
      ]),
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
    });

    expect(callArgs.docs[3]).toEqual({
      '@timestamp': mockDate.toISOString(),
      actor: 'system',
      action_type: 'notified',
      rule_id: 'rule-dispatch',
      group_hash: 'irrelevant',
      last_series_event_timestamp: mockDate.toISOString(),
      notification_group_id: 'dispatch-group',
      source: 'internal',
      reason: 'notified by policy dispatch-policy with throttle interval',
    });
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
          reason: 'no matching notification policy',
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

    const dispatchGroup = createNotificationGroup({
      id: 'dispatch-group',
      ruleId: 'rule-dispatch',
      policyId: 'dispatch-policy',
      episodes: [dispatchedEpisode],
    });

    const throttledGroup = createNotificationGroup({
      id: 'throttled-group',
      policyId: 'throttle-policy',
      episodes: [throttledEpisode],
    });

    const state = createDispatcherPipelineState({
      dispatchable: [dispatchedEpisode, throttledEpisode, unmatchedEpisode],
      suppressed: [],
      throttled: [throttledGroup],
      dispatch: [dispatchGroup],
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
      reason: 'no matching notification policy',
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

    const group = createNotificationGroup({
      id: 'group-1',
      ruleId: 'rule-1',
      policyId: 'policy-1',
      episodes: [episode1, episode2],
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.docs).toHaveLength(2);
    expect(callArgs.docs[0].action_type).toBe('fire');
    expect(callArgs.docs[0].group_hash).toBe('hash-1');
    expect(callArgs.docs[1].action_type).toBe('fire');
    expect(callArgs.docs[1].group_hash).toBe('hash-2');
  });
});

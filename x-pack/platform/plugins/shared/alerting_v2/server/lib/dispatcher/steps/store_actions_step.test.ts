/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StoreActionsStep } from './store_actions_step';
import { createMockStorageServiceContract } from '../../services/storage_service/storage_service.mock';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
import {
  createActionGroup,
  createActionPolicy,
  createAlertEpisode,
  createDispatcherPipelineState,
  createRule,
  createStepLogger,
} from '../fixtures/test_utils';

const logger = createStepLogger();

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
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const state = createDispatcherPipelineState({
      dispatchable: [],
      suppressed: [],
      throttled: [],
      dispatch: [],
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'halt', reason: 'no_actions' });
    expect(mockService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('halts when suppressed, throttled, and dispatch are all empty', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const state = createDispatcherPipelineState({
      suppressed: [],
      throttled: [],
      dispatch: [],
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'halt', reason: 'no_actions' });
    expect(mockService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('halts when suppressed, throttled, and dispatch are undefined', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const state = createDispatcherPipelineState({});

    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'halt', reason: 'no_actions' });
    expect(mockService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('records suppressed episodes with action_type suppress', async () => {
    const mockService = createMockStorageServiceContract();
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

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
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
    const mockService = createMockStorageServiceContract();
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

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
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

  it('handles combined suppressed, throttled, and dispatch arrays', async () => {
    const mockService = createMockStorageServiceContract();
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
      recordedEpisodes: 1,
      suppressed: [{ ...suppressedEpisode, reason: 'manually suppressed' }],
      throttled: [throttledGroup],
      dispatch: [dispatchGroup],
      rules: createRules('rule-suppressed', 'rule-throttled', 'rule-dispatch'),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.index).toBe(ALERT_ACTIONS_DATA_STREAM);
    expect(callArgs.docs).toHaveLength(2);

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
  });

  it('records unmatched episodes with action_type unmatched', async () => {
    const mockService = createMockStorageServiceContract();
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

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
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
    const mockService = createMockStorageServiceContract();
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

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.docs).toHaveLength(2);
    expect(callArgs.docs[0].action_type).toBe('unmatched');
    expect(callArgs.docs[1].action_type).toBe('unmatched');
  });

  it('records unmatched episodes alongside dispatched and throttled groups', async () => {
    const mockService = createMockStorageServiceContract();
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
      recordedEpisodes: 1,
      dispatchable: [dispatchedEpisode, throttledEpisode, unmatchedEpisode],
      suppressed: [],
      throttled: [throttledGroup],
      dispatch: [dispatchGroup],
      rules: createRules('rule-dispatch', 'rule-throttled', 'rule-unmatched'),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    const actionTypes = callArgs.docs.map(
      (d: Record<string, unknown>) => d.action_type as AlertAction['action_type']
    );
    expect(actionTypes).toContain('suppress');
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


  describe('space_id resolution', () => {
    it('uses the space_id from the episode directly', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const episode = createAlertEpisode({
        rule_id: 'rule-in-custom-space',
        space_id: 'custom',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...episode, reason: 'suppressed' }],
      });

      await step.execute(state, logger);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('custom');
    });

    it('uses the default space_id from the episode when it is "default"', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const episode = createAlertEpisode({
        rule_id: 'rule-1',
        space_id: 'default',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...episode, reason: 'suppressed' }],
      });

      await step.execute(state, logger);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('default');
    });

    it('uses the default space_id from the episode when rules map is undefined', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const episode = createAlertEpisode({
        rule_id: 'rule-1',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...episode, reason: 'suppressed' }],
      });

      await step.execute(state, logger);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('default');
    });

    it('resolves different space_id for episodes in different spaces', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const episode1 = createAlertEpisode({
        rule_id: 'rule-space-a',
        space_id: 'space-a',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const episode2 = createAlertEpisode({
        rule_id: 'rule-space-b',
        space_id: 'space-b',
        group_hash: 'hash-2',
        last_event_timestamp: '2026-01-22T07:05:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [
          { ...episode1, reason: 'suppressed' },
          { ...episode2, reason: 'suppressed' },
        ],
      });

      await step.execute(state, logger);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('space-a');
      expect(callArgs.docs[1].space_id).toBe('space-b');
    });
  });


  describe('recordedEpisodes count', () => {
    it('counts suppressed episodes', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        suppressed: [
          { ...createAlertEpisode({ episode_id: 'ep-1' }), reason: 'acked' },
          { ...createAlertEpisode({ episode_id: 'ep-2' }), reason: 'acked' },
        ],
        throttled: [],
        dispatch: [],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedEpisodes: 2 } })
      );
    });

    it('counts throttled episodes across groups', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        suppressed: [],
        throttled: [
          createActionGroup({
            id: 'g1',
            episodes: [
              createAlertEpisode({ episode_id: 'e1' }),
              createAlertEpisode({ episode_id: 'e2' }),
            ],
          }),
          createActionGroup({ id: 'g2', episodes: [createAlertEpisode({ episode_id: 'e3' })] }),
        ],
        dispatch: [],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedEpisodes: 3 } })
      );
    });

    it('propagates state.recordedEpisodes from DispatchStep', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        recordedEpisodes: 2,
        suppressed: [],
        throttled: [],
        dispatch: [
          createActionGroup({
            id: 'g1',
            episodes: [
              createAlertEpisode({ episode_id: 'e1' }),
              createAlertEpisode({ episode_id: 'e2' }),
            ],
          }),
        ],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedEpisodes: 2 } })
      );
    });

    it('counts unmatched episodes', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        dispatchable: [
          createAlertEpisode({ episode_id: 'e1' }),
          createAlertEpisode({ episode_id: 'e2' }),
          createAlertEpisode({ episode_id: 'e3' }),
        ],
        suppressed: [],
        throttled: [],
        dispatch: [],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedEpisodes: 3 } })
      );
    });

    it('sums all buckets: state.recordedEpisodes + suppressed + throttled + unmatched', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      // state.recordedEpisodes=1 (from DispatchStep) + 1 suppressed + 1 throttled + 1 unmatched = 4
      const unmatchedEpisode = createAlertEpisode({
        episode_id: 'ep-unmatched',
        group_hash: 'h-unmatched',
      });
      const dispatchedEpisode = createAlertEpisode({
        episode_id: 'ep-dispatch',
        group_hash: 'h-dispatch',
      });
      const throttledEpisode = createAlertEpisode({
        episode_id: 'ep-throttled',
        group_hash: 'h-throttled',
      });

      const state = createDispatcherPipelineState({
        recordedEpisodes: 1,
        dispatchable: [dispatchedEpisode, throttledEpisode, unmatchedEpisode],
        suppressed: [{ ...createAlertEpisode({ episode_id: 'ep-sup' }), reason: 'acked' }],
        throttled: [createActionGroup({ id: 'g-throttle', episodes: [throttledEpisode] })],
        dispatch: [createActionGroup({ id: 'g-dispatch', episodes: [dispatchedEpisode] })],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedEpisodes: 4 } })
      );
    });
  });

  describe('halt guard with state.recordedEpisodes from DispatchStep', () => {
    it('halts with no_actions when dispatch non-empty but recordedEpisodes=0 and no suppress/throttle/unmatched', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        dispatchable: [],
        suppressed: [],
        throttled: [],
        dispatch: [createActionGroup({ id: 'g1' })],
        recordedEpisodes: 0,
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual({ type: 'halt', reason: 'no_actions' });
      expect(mockService.bulkIndexDocs).not.toHaveBeenCalled();
    });

    it('continues when state.recordedEpisodes > 0 even if suppress/throttle/unmatched are empty', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        dispatchable: [],
        suppressed: [],
        throttled: [],
        dispatch: [],
        recordedEpisodes: 3,
      });

      const result = await step.execute(state, logger);

      expect(result.type).toBe('continue');
    });

    it('accumulates state.recordedEpisodes from DispatchStep with local suppress/throttle/unmatched counts', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const suppEpisode = createAlertEpisode({ episode_id: 'e-supp', group_hash: 'h-supp' });
      const throttleEpisode = createAlertEpisode({
        episode_id: 'e-throttle',
        group_hash: 'h-throttle',
      });
      const unmatchedEpisode = createAlertEpisode({
        episode_id: 'e-unmatched',
        group_hash: 'h-unmatched',
      });

      const state = createDispatcherPipelineState({
        recordedEpisodes: 5,
        dispatchable: [unmatchedEpisode],
        suppressed: [{ ...suppEpisode, reason: 'acked' }],
        throttled: [
          createActionGroup({ id: 'g-t', policyId: 'p1', episodes: [throttleEpisode] }),
        ],
        dispatch: [],
      });

      const result = await step.execute(state, logger);

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(result.data?.recordedEpisodes).toBe(8);
    });

    it('does not write fire or notified records for dispatch groups', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const episode = createAlertEpisode({ episode_id: 'e1', group_hash: 'h1' });
      const group = createActionGroup({ id: 'g1', policyId: 'p1', episodes: [episode] });

      const state = createDispatcherPipelineState({
        recordedEpisodes: 1,
        dispatchable: [episode],
        suppressed: [],
        throttled: [],
        dispatch: [group],
      });

      await step.execute(state, logger);

      if (mockService.bulkIndexDocs.mock.calls.length > 0) {
        const { docs } = mockService.bulkIndexDocs.mock.calls[0][0];
        const fireOrNotified = docs.filter(
          (d: Record<string, unknown>) =>
            d.action_type === 'fire' || d.action_type === 'notified'
        );
        expect(fireOrNotified).toHaveLength(0);
      }
    });
  });
});

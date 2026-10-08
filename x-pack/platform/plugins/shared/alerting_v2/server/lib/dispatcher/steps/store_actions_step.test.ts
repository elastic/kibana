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
  createAlert,
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

  it('halts when there are no alerts at all', async () => {
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

  it('records suppressed alerts with action_type suppress', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const alert = createAlert({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const state = createDispatcherPipelineState({
      suppressed: [{ ...alert, reason: 'user acknowledged' }],
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
          group_hash: 'hash-1',
          last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
          actor: { type: 'internal' },
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

    const alert = createAlert({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      alerts: [alert],
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
          group_hash: 'hash-1',
          last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
          actor: { type: 'internal' },
          action_type: 'suppress',
          rule_id: 'rule-1',
          source: 'internal',
          reason: 'suppressed by throttled policy policy-1',
          space_id: 'default',
        },
      ],
    });
  });

  it('records dispatched alerts with fire and notified actions', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const alert = createAlert({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      alerts: [alert],
    });

    const state = createDispatcherPipelineState({
      suppressed: [],
      throttled: [],
      dispatch: [group],
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);
    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.docs).toHaveLength(2);
    expect(callArgs.docs[0]).toEqual({
      group_hash: 'hash-1',
      last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
      actor: { type: 'internal' },
      action_type: 'fire',
      rule_id: 'rule-1',
      source: 'internal',
      reason: 'dispatched by policy policy-1',
      space_id: 'default',
    });
    expect(callArgs.docs[1]).toEqual({
      actor: { type: 'internal' },
      action_type: 'notified',
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_series_event_timestamp: mockDate.toISOString(),
      action_group_id: 'group-1',
      source: 'internal',
      reason: 'notified by policy policy-1',
      alert_status: 'active',
      space_id: 'default',
    });
  });

  it('includes alert_status on notified record for per_alert mode', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const alert = createAlert({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      alert_status: 'recovering',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      alerts: [alert],
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([
        ['policy-1', createActionPolicy({ id: 'policy-1', throttle: { interval: '1h' } })],
      ]),
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
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
        alert_status: 'recovering',
        reason: 'notified by policy policy-1',
        space_id: 'default',
      })
    );
    expect(notifiedDoc).not.toHaveProperty('episode_status');
  });

  it('omits alert_status on notified record for all mode', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const alert = createAlert({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      alerts: [alert],
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

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    const notifiedDoc = callArgs.docs.find(
      (d: Record<string, unknown>) => d.action_type === 'notified'
    );
    expect(notifiedDoc).toBeDefined();
    expect(notifiedDoc?.alert_status).toBeUndefined();
  });

  it('handles combined suppressed, throttled, and dispatch arrays', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const suppressedAlert = createAlert({
      rule_id: 'rule-suppressed',
      group_hash: 'hash-suppressed',
      alert_id: 'ep-suppressed',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const throttledAlert = createAlert({
      rule_id: 'rule-throttled',
      group_hash: 'hash-throttled',
      alert_id: 'ep-throttled',
      last_event_timestamp: '2026-01-22T07:10:00.000Z',
    });

    const dispatchAlert = createAlert({
      rule_id: 'rule-dispatch',
      group_hash: 'hash-dispatch',
      alert_id: 'ep-dispatch',
      last_event_timestamp: '2026-01-22T07:20:00.000Z',
    });

    const throttledGroup = createActionGroup({
      id: 'throttled-group',
      policyId: 'throttle-policy',
      alerts: [throttledAlert],
    });

    const dispatchGroup = createActionGroup({
      id: 'dispatch-group',
      policyId: 'dispatch-policy',
      alerts: [dispatchAlert],
    });

    const state = createDispatcherPipelineState({
      suppressed: [{ ...suppressedAlert, reason: 'manually suppressed' }],
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

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
    expect(mockService.bulkIndexDocs).toHaveBeenCalledTimes(1);

    const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
    expect(callArgs.index).toBe(ALERT_ACTIONS_DATA_STREAM);
    expect(callArgs.docs).toHaveLength(4);

    expect(callArgs.docs[0]).toEqual({
      group_hash: 'hash-suppressed',
      last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
      actor: { type: 'internal' },
      action_type: 'suppress',
      rule_id: 'rule-suppressed',
      source: 'internal',
      reason: 'manually suppressed',
      space_id: 'default',
    });

    expect(callArgs.docs[1]).toEqual({
      group_hash: 'hash-throttled',
      last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
      actor: { type: 'internal' },
      action_type: 'suppress',
      rule_id: 'rule-throttled',
      source: 'internal',
      reason: 'suppressed by throttled policy throttle-policy',
      space_id: 'default',
    });

    expect(callArgs.docs[2]).toEqual({
      group_hash: 'hash-dispatch',
      last_series_event_timestamp: '2026-01-22T07:20:00.000Z',
      actor: { type: 'internal' },
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
        alert_status: 'active',
        reason: 'notified by policy dispatch-policy',
        space_id: 'default',
      })
    );
  });

  it('records unmatched alerts with action_type unmatched', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const unmatchedAlert = createAlert({
      rule_id: 'rule-unmatched',
      group_hash: 'hash-unmatched',
      alert_id: 'ep-unmatched',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const state = createDispatcherPipelineState({
      dispatchable: [unmatchedAlert],
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
          group_hash: 'hash-unmatched',
          last_series_event_timestamp: '2026-01-22T07:00:00.000Z',
          actor: { type: 'internal' },
          action_type: 'unmatched',
          rule_id: 'rule-unmatched',
          source: 'internal',
          reason: 'no matching action policy',
          space_id: 'default',
        },
      ],
    });
  });

  it('does not halt when only unmatched alerts exist', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const alert1 = createAlert({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      alert_id: 'ep-1',
    });

    const alert2 = createAlert({
      rule_id: 'rule-2',
      group_hash: 'hash-2',
      alert_id: 'ep-2',
    });

    const state = createDispatcherPipelineState({
      dispatchable: [alert1, alert2],
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

  it('records unmatched alerts alongside dispatched and throttled groups', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const dispatchedAlert = createAlert({
      rule_id: 'rule-dispatch',
      group_hash: 'hash-dispatch',
      alert_id: 'ep-dispatch',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const throttledAlert = createAlert({
      rule_id: 'rule-throttled',
      group_hash: 'hash-throttled',
      alert_id: 'ep-throttled',
      last_event_timestamp: '2026-01-22T07:05:00.000Z',
    });

    const unmatchedAlert = createAlert({
      rule_id: 'rule-unmatched',
      group_hash: 'hash-unmatched',
      alert_id: 'ep-unmatched',
      last_event_timestamp: '2026-01-22T07:10:00.000Z',
    });

    const dispatchGroup = createActionGroup({
      id: 'dispatch-group',
      policyId: 'dispatch-policy',
      alerts: [dispatchedAlert],
    });

    const throttledGroup = createActionGroup({
      id: 'throttled-group',
      policyId: 'throttle-policy',
      alerts: [throttledAlert],
    });

    const state = createDispatcherPipelineState({
      dispatchable: [dispatchedAlert, throttledAlert, unmatchedAlert],
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
    expect(actionTypes).toContain('fire');
    expect(actionTypes).toContain('unmatched');

    const noActionDocs = callArgs.docs.filter(
      (d: Record<string, unknown>) => d.action_type === 'unmatched'
    );
    expect(noActionDocs).toHaveLength(1);
    expect(noActionDocs[0]).toEqual({
      group_hash: 'hash-unmatched',
      last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
      actor: { type: 'internal' },
      action_type: 'unmatched',
      rule_id: 'rule-unmatched',
      source: 'internal',
      reason: 'no matching action policy',
      space_id: 'default',
    });
  });

  it('records multiple alerts within a single dispatch group', async () => {
    const mockService = createMockStorageServiceContract();
    const step = new StoreActionsStep(mockService);

    const alert1 = createAlert({
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      alert_id: 'ep-1',
      last_event_timestamp: '2026-01-22T07:00:00.000Z',
    });

    const alert2 = createAlert({
      rule_id: 'rule-1',
      group_hash: 'hash-2',
      alert_id: 'ep-2',
      last_event_timestamp: '2026-01-22T07:05:00.000Z',
    });

    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      alerts: [alert1, alert2],
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      rules: createRules('rule-1'),
    });

    const result = await step.execute(state, logger);

    expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
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
    it('uses the space_id from the alert directly', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const alert = createAlert({
        rule_id: 'rule-in-custom-space',
        space_id: 'custom',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...alert, reason: 'suppressed' }],
      });

      await step.execute(state, logger);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('custom');
    });

    it('uses the default space_id from the alert when it is "default"', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const alert = createAlert({
        rule_id: 'rule-1',
        space_id: 'default',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...alert, reason: 'suppressed' }],
      });

      await step.execute(state, logger);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('default');
    });

    it('uses the default space_id from the alert when rules map is undefined', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const alert = createAlert({
        rule_id: 'rule-1',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [{ ...alert, reason: 'suppressed' }],
      });

      await step.execute(state, logger);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('default');
    });

    it('resolves different space_id for alerts in different spaces', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const alert1 = createAlert({
        rule_id: 'rule-space-a',
        space_id: 'space-a',
        group_hash: 'hash-1',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const alert2 = createAlert({
        rule_id: 'rule-space-b',
        space_id: 'space-b',
        group_hash: 'hash-2',
        last_event_timestamp: '2026-01-22T07:05:00.000Z',
      });

      const state = createDispatcherPipelineState({
        suppressed: [
          { ...alert1, reason: 'suppressed' },
          { ...alert2, reason: 'suppressed' },
        ],
      });

      await step.execute(state, logger);

      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];
      expect(callArgs.docs[0].space_id).toBe('space-a');
      expect(callArgs.docs[1].space_id).toBe('space-b');
    });
  });

  describe('external alerts (source-based, no rule_id)', () => {
    it('records external alert fire action with vendor source and null rule_id', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const externalAlert = createAlert({
        rule_id: null,
        source: 'pagerduty',
        space_id: 'space-a',
        group_hash: 'pd-group-hash',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const group = createActionGroup({
        id: 'group-pd',
        policyId: 'policy-1',
        alerts: [externalAlert],
      });

      const state = createDispatcherPipelineState({
        dispatch: [group],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];

      const fireDoc = callArgs.docs.find((d: Record<string, unknown>) => d.action_type === 'fire');
      expect(fireDoc).toEqual(
        expect.objectContaining({
          action_type: 'fire',
          source: 'pagerduty',
          rule_id: null,
          group_hash: 'pd-group-hash',
          space_id: 'space-a',
          actor: { type: 'internal' },
        })
      );
    });

    it('records external alert notified action with vendor source and null rule_id', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const externalAlert = createAlert({
        rule_id: null,
        source: 'pagerduty',
        space_id: 'space-a',
        group_hash: 'pd-group-hash',
        last_event_timestamp: '2026-01-22T07:00:00.000Z',
      });

      const group = createActionGroup({
        id: 'group-pd',
        policyId: 'policy-1',
        alerts: [externalAlert],
      });

      const state = createDispatcherPipelineState({
        dispatch: [group],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(expect.objectContaining({ type: 'continue' }));
      const callArgs = mockService.bulkIndexDocs.mock.calls[0][0];

      const notifiedDoc = callArgs.docs.find(
        (d: Record<string, unknown>) => d.action_type === 'notified'
      );
      expect(notifiedDoc).toEqual(
        expect.objectContaining({
          action_type: 'notified',
          source: 'pagerduty',
          rule_id: null,
          group_hash: 'pd-group-hash',
          space_id: 'space-a',
          actor: { type: 'internal' },
        })
      );
    });
  });

  describe('recordedAlerts count', () => {
    it('counts suppressed alerts', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        suppressed: [
          { ...createAlert({ alert_id: 'ep-1' }), reason: 'acked' },
          { ...createAlert({ alert_id: 'ep-2' }), reason: 'acked' },
        ],
        throttled: [],
        dispatch: [],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedAlerts: 2 } })
      );
    });

    it('counts throttled alerts across groups', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        suppressed: [],
        throttled: [
          createActionGroup({
            id: 'g1',
            alerts: [createAlert({ alert_id: 'e1' }), createAlert({ alert_id: 'e2' })],
          }),
          createActionGroup({ id: 'g2', alerts: [createAlert({ alert_id: 'e3' })] }),
        ],
        dispatch: [],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedAlerts: 3 } })
      );
    });

    it('counts dispatch alerts across groups', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        suppressed: [],
        throttled: [],
        dispatch: [
          createActionGroup({
            id: 'g1',
            alerts: [createAlert({ alert_id: 'e1' }), createAlert({ alert_id: 'e2' })],
          }),
        ],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedAlerts: 2 } })
      );
    });

    it('counts unmatched alerts', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      const state = createDispatcherPipelineState({
        dispatchable: [
          createAlert({ alert_id: 'e1' }),
          createAlert({ alert_id: 'e2' }),
          createAlert({ alert_id: 'e3' }),
        ],
        suppressed: [],
        throttled: [],
        dispatch: [],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedAlerts: 3 } })
      );
    });

    it('sums all buckets', async () => {
      const mockService = createMockStorageServiceContract();
      const step = new StoreActionsStep(mockService);

      // 1 suppressed + 1 throttled (in a group) + 1 dispatch (in a group) + 1 unmatched = 4
      const unmatchedAlert = createAlert({
        alert_id: 'ep-unmatched',
        group_hash: 'h-unmatched',
      });
      const dispatchedAlert = createAlert({
        alert_id: 'ep-dispatch',
        group_hash: 'h-dispatch',
      });
      const throttledAlert = createAlert({
        alert_id: 'ep-throttled',
        group_hash: 'h-throttled',
      });

      const state = createDispatcherPipelineState({
        dispatchable: [dispatchedAlert, throttledAlert, unmatchedAlert],
        suppressed: [{ ...createAlert({ alert_id: 'ep-sup' }), reason: 'acked' }],
        throttled: [createActionGroup({ id: 'g-throttle', alerts: [throttledAlert] })],
        dispatch: [createActionGroup({ id: 'g-dispatch', alerts: [dispatchedAlert] })],
      });

      const result = await step.execute(state, logger);

      expect(result).toEqual(
        expect.objectContaining({ type: 'continue', data: { recordedAlerts: 4 } })
      );
    });
  });
});

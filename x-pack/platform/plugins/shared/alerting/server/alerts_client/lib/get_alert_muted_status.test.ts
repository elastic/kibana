/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertMutedStatus } from './get_alert_muted_status';
import type { AlertRuleDataInput } from '../types';
import { createAlertRuleData } from '../types';

const createMockRuleData = (overrides: Partial<AlertRuleDataInput> = {}) =>
  createAlertRuleData({
    consumer: 'test-consumer',
    executionId: 'exec-1',
    id: 'rule-1',
    name: 'Test Rule',
    parameters: {},
    revision: 1,
    spaceId: 'default',
    tags: [],
    alertDelay: 0,
    muteAll: false,
    mutedInstanceIds: [],
    ...overrides,
  });

describe('getAlertMutedStatus', () => {
  test('should return false when ruleData is undefined', () => {
    expect(getAlertMutedStatus('alert-1')).toBe(false);
  });

  test('should return false when alert is not in mutedInstanceIds or snoozedInstances', () => {
    const ruleData = createMockRuleData();
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(false);
  });

  test('should return false when alertInstanceId is not in mutedInstanceIds (other instances muted)', () => {
    const ruleData = createMockRuleData({ mutedInstanceIds: ['alert-2', 'alert-3'] });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(false);
  });

  test('should return true when muteAll is true', () => {
    const ruleData = createMockRuleData({ muteAll: true });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return true when alertInstanceId is in mutedInstanceIds', () => {
    const ruleData = createMockRuleData({ mutedInstanceIds: ['alert-1', 'alert-2'] });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return true when alertInstanceId is in snoozedInstances (time-only)', () => {
    const ruleData = createMockRuleData({
      snoozedInstances: [
        { instanceId: 'alert-1', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      ],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return true when alertInstanceId is in snoozedInstances (condition-based)', () => {
    const ruleData = createMockRuleData({
      snoozedInstances: [
        {
          instanceId: 'alert-1',
          conditions: [
            { type: 'field_change', field: 'kibana.alert.severity', snapshotValue: 'critical' },
          ],
        },
      ],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return false when a different alertInstanceId is in snoozedInstances', () => {
    const ruleData = createMockRuleData({
      snoozedInstances: [
        { instanceId: 'alert-2', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      ],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(false);
  });

  test('should return false when snoozedInstances is undefined (treated as empty)', () => {
    const ruleData = createMockRuleData({ snoozedInstances: undefined });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(false);
  });

  test('should return false when snoozedInstances is empty array', () => {
    const ruleData = createMockRuleData({ snoozedInstances: [] });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(false);
  });

  test('should return true when snoozedInstances has multiple entries and one matches alertInstanceId', () => {
    const ruleData = createMockRuleData({
      snoozedInstances: [
        { instanceId: 'alert-2', expiresAt: new Date(Date.now() + 60_000).toISOString() },
        { instanceId: 'alert-1', expiresAt: new Date(Date.now() + 60_000).toISOString() },
        { instanceId: 'alert-3', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      ],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return false when snoozedInstances has multiple entries and none match alertInstanceId', () => {
    const ruleData = createMockRuleData({
      snoozedInstances: [
        { instanceId: 'alert-2', expiresAt: new Date(Date.now() + 60_000).toISOString() },
        { instanceId: 'alert-3', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      ],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(false);
  });

  test('should return true when both muteAll is true and alertInstanceId is in mutedInstanceIds', () => {
    const ruleData = createMockRuleData({
      muteAll: true,
      mutedInstanceIds: ['alert-1'],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return true when muteAll is true even if alertInstanceId is not in mutedInstanceIds', () => {
    const ruleData = createMockRuleData({
      muteAll: true,
      mutedInstanceIds: ['alert-2'],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return true when alert is in both mutedInstanceIds and snoozedInstances', () => {
    const ruleData = createMockRuleData({
      mutedInstanceIds: ['alert-1'],
      snoozedInstances: [
        { instanceId: 'alert-1', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      ],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return true when legacyAlert has getSnoozeConfig() set (snooze from alert)', () => {
    const ruleData = createMockRuleData();
    const legacyAlert = {
      getSnoozeConfig: () => ({ instanceId: 'alert-1', expiresAt: new Date().toISOString() }),
    };
    expect(getAlertMutedStatus('alert-1', ruleData, legacyAlert)).toBe(true);
  });

  test('should return false when legacyAlert has getSnoozeConfig() returning undefined', () => {
    const ruleData = createMockRuleData();
    const legacyAlert = { getSnoozeConfig: () => undefined };
    expect(getAlertMutedStatus('alert-1', ruleData, legacyAlert)).toBe(false);
  });

  describe('createAlertRuleData immutability', () => {
    test('defensive copies isolate derived Sets from caller mutations', () => {
      const input: AlertRuleDataInput = {
        consumer: 'test',
        executionId: 'exec-1',
        id: 'rule-1',
        name: 'test-rule',
        parameters: {},
        revision: 0,
        spaceId: 'default',
        tags: Array.from({ length: 3 }, (_, i) => `tag-${i}`),
        alertDelay: 0,
        muteAll: false,
        mutedInstanceIds: ['muted-0', 'muted-1'],
        snoozedInstances: [
          { instanceId: 'snoozed-0', expiresAt: new Date(Date.now() + 60_000).toISOString() },
        ],
      };
      const data = createAlertRuleData(input);

      input.mutedInstanceIds.push('injected');
      expect(data.mutedInstanceIdsSet.has('injected')).toBe(false);
      expect(data.mutedInstanceIds).not.toContain('injected');

      input.tags.push('new-tag');
      expect(data.tags).toContain('new-tag');
    });

    test('prebuiltSets are used as-is when provided', () => {
      const input: AlertRuleDataInput = {
        consumer: 'test',
        executionId: 'exec-1',
        id: 'rule-1',
        name: 'test-rule',
        parameters: {},
        revision: 0,
        spaceId: 'default',
        tags: [],
        alertDelay: 0,
        muteAll: false,
        mutedInstanceIds: ['a', 'b'],
        snoozedInstances: [
          { instanceId: 'x', expiresAt: new Date(Date.now() + 60_000).toISOString() },
        ],
      };
      const mutedSet = new Set(input.mutedInstanceIds);
      const snoozedSet = new Set(['x']);
      const data = createAlertRuleData(input, {
        mutedInstanceIdsSet: mutedSet,
        snoozedInstanceIdsSet: snoozedSet,
      });

      expect(data.mutedInstanceIdsSet).toBe(mutedSet);
      expect(data.snoozedInstanceIdsSet).toBe(snoozedSet);
    });
  });
});

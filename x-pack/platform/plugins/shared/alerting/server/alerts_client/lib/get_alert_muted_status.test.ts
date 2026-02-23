/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertMutedStatus } from './get_alert_muted_status';
import type { AlertRuleData } from '../types';

const createMockRuleData = (overrides: Partial<AlertRuleData> = {}): AlertRuleData => ({
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

  describe('micro-benchmarks', () => {
    const runTimingLoop = (fn: () => void, runs: number): { totalMs: number; meanMs: number } => {
      const start = performance.now();
      for (let i = 0; i < runs; i++) {
        fn();
      }
      const totalMs = performance.now() - start;
      return { totalMs, meanMs: totalMs / runs };
    };

    test('getAlertMutedStatus with 0 entries (baseline)', () => {
      const ruleData = createMockRuleData();
      const runs = 1000;
      const { meanMs } = runTimingLoop(() => {
        getAlertMutedStatus('alert-1', ruleData);
      }, runs);
      expect(meanMs).toBeLessThan(0.5);
    });

    test('getAlertMutedStatus with 10 mutedInstanceIds', () => {
      const ruleData = createMockRuleData({
        mutedInstanceIds: Array.from({ length: 10 }, (_, i) => `alert-${i}`),
      });
      const runs = 1000;
      const { meanMs } = runTimingLoop(() => {
        getAlertMutedStatus('alert-5', ruleData);
      }, runs);
      expect(meanMs).toBeLessThan(0.5);
    });

    test('getAlertMutedStatus with 100 snoozedInstances', () => {
      const ruleData = createMockRuleData({
        snoozedInstances: Array.from({ length: 100 }, (_, i) => ({
          instanceId: `alert-${i}`,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        })),
      });
      const runs = 500;
      const { meanMs } = runTimingLoop(() => {
        getAlertMutedStatus('alert-50', ruleData);
      }, runs);
      expect(meanMs).toBeLessThan(1);
    });

    test('getAlertMutedStatus with 1000 snoozedInstances (regression guard)', () => {
      const ruleData = createMockRuleData({
        snoozedInstances: Array.from({ length: 1000 }, (_, i) => ({
          instanceId: `alert-${i}`,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        })),
      });
      const runs = 100;
      const { meanMs } = runTimingLoop(() => {
        getAlertMutedStatus('alert-500', ruleData);
      }, runs);
      expect(meanMs).toBeLessThan(5);
    });
  });
});

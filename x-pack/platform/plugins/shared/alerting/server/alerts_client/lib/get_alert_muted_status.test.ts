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

  describe('memory overhead of createAlertRuleData', () => {
    const measureHeapDelta = (fn: () => unknown): number => {
      if (typeof global.gc === 'function') global.gc();
      const before = process.memoryUsage().heapUsed;
      const result = fn();
      if (typeof global.gc === 'function') global.gc();
      const after = process.memoryUsage().heapUsed;
      void result;
      return after - before;
    };

    const makeInput = (n: number): AlertRuleDataInput => ({
      consumer: 'test',
      executionId: 'exec-1',
      id: 'rule-1',
      name: 'test-rule',
      parameters: {},
      revision: 0,
      spaceId: 'default',
      tags: Array.from({ length: 10 }, (_, i) => `tag-${i}`),
      alertDelay: 0,
      muteAll: false,
      mutedInstanceIds: Array.from({ length: n }, (_, i) => `muted-instance-${i}`),
      snoozedInstances: Array.from({ length: Math.floor(n / 2) }, (_, i) => ({
        instanceId: `snoozed-instance-${i}`,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })),
    });

    // For accurate measurements run with: node --expose-gc
    // Without --expose-gc, GC cannot be forced and results include JIT/runtime noise.
    test.each([100, 1_000, 10_000])(
      'createAlertRuleData with %i muted IDs stays within 200 bytes/entry',
      (n) => {
        const input = makeInput(n);
        const delta = measureHeapDelta(() => createAlertRuleData(input));
        const bytesPerEntry = delta / n;
        // eslint-disable-next-line no-console
        console.log(
          `createAlertRuleData n=${n}: heapDelta=${delta} bytes (${bytesPerEntry.toFixed(
            1
          )} bytes/entry)`
        );
        expect(bytesPerEntry).toBeLessThan(200);
      }
    );

    test('pre-built Sets avoid duplicate allocation', () => {
      const n = 5_000;
      const input = makeInput(n);

      const deltaWithout = measureHeapDelta(() => createAlertRuleData(input));

      const prebuiltSets = {
        mutedInstanceIdsSet: new Set(input.mutedInstanceIds),
        snoozedInstanceIdsSet: new Set((input.snoozedInstances ?? []).map((e) => e.instanceId)),
      };

      const deltaWith = measureHeapDelta(() => createAlertRuleData(input, prebuiltSets));
      // eslint-disable-next-line no-console
      console.log(
        `Pre-built sets: without=${deltaWithout}, with=${deltaWith}, saved=${
          deltaWithout - deltaWith
        }`
      );
      expect(deltaWith).toBeLessThanOrEqual(deltaWithout);
    });

    test('defensive copies isolate derived Sets from caller mutations', () => {
      const input = makeInput(5);
      const data = createAlertRuleData(input);

      // Mutating the caller's array must not affect the derived Set
      input.mutedInstanceIds.push('injected');
      expect(data.mutedInstanceIdsSet.has('injected')).toBe(false);
      expect(data.mutedInstanceIds).not.toContain('injected');

      // tags are passed by reference (no derived Set), so caller mutation is visible
      input.tags.push('new-tag');
      expect(data.tags).toContain('new-tag');
    });
  });
});

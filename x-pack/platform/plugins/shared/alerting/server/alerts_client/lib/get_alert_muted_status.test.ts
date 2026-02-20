/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_MUTED } from '@kbn/rule-data-utils';
import { getAlertMutedStatus } from './get_alert_muted_status';
import type { AlertRuleData } from '../types';
import {
  createTimeOnlySnoozeAlert,
  createConditionOnlySnoozeAlert,
} from './fixtures/snooze_alert_fixtures';

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
  test('should return false when ruleData is undefined and no conditional snooze exists', () => {
    expect(getAlertMutedStatus('alert-1')).toBe(false);
  });

  test('should return true when alert document is conditionally snoozed with expiry', () => {
    const alert = createTimeOnlySnoozeAlert(
      new Date(Date.now() + 60_000).toISOString()
    );
    expect(getAlertMutedStatus('alert-1', undefined, alert)).toBe(true);
  });

  test('should return true when alert document is conditionally snoozed with conditions', () => {
    const alert = createConditionOnlySnoozeAlert({
      conditions: [
        {
          type: 'field_change',
          field: 'kibana.alert.severity',
          snapshotValue: 'critical',
        },
      ],
    });
    expect(getAlertMutedStatus('alert-1', undefined, alert)).toBe(true);
  });

  test('should return false when alert document is muted but has no conditional snooze config', () => {
    expect(
      getAlertMutedStatus('alert-1', undefined, {
        [ALERT_MUTED]: true,
      })
    ).toBe(false);
  });

  test('should return false when ruleData exists but muteAll is false and alertInstanceId is not muted', () => {
    const ruleData = createMockRuleData();
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(false);
  });

  test('should return false when alertInstanceId is not in mutedInstanceIds', () => {
    const ruleData = createMockRuleData({
      mutedInstanceIds: ['alert-2', 'alert-3'],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(false);
  });

  test('should return true when muteAll is true', () => {
    const ruleData = createMockRuleData({
      muteAll: true,
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
  });

  test('should return true when alertInstanceId is in mutedInstanceIds', () => {
    const ruleData = createMockRuleData({
      mutedInstanceIds: ['alert-1', 'alert-2'],
    });
    expect(getAlertMutedStatus('alert-1', ruleData)).toBe(true);
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
});

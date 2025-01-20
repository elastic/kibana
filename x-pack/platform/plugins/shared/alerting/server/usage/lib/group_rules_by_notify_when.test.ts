/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupRulesByNotifyWhen } from './group_rules_by_notify_when';

describe('groupRulesByNotifyWhen', () => {
  test('should correctly group rules by combining ok and active statuses', () => {
    expect(
      groupRulesByNotifyWhen({
        onActionGroupChange: 1,
        onActiveAlert: 2,
        onThrottleInterval: 3,
        foo: 5,
      })
    ).toEqual({
      on_action_group_change: 1,
      on_active_alert: 2,
      on_throttle_interval: 3,
    });
  });

  test('should fallback to 0 if any of the expected statuses are absent', () => {
    expect(groupRulesByNotifyWhen({ unknown: 100, bar: 300 })).toEqual({
      on_action_group_change: 0,
      on_active_alert: 0,
      on_throttle_interval: 0,
    });
  });
});

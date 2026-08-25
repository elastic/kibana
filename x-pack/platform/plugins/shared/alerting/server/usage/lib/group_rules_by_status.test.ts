/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupRulesByStatus } from './group_rules_by_status';

describe('groupRulesByStatus', () => {
  test('should correctly group rules by combining ok and active statuses', () => {
    expect(
      groupRulesByStatus({ ok: 3, active: 3, error: 4, warning: 5, unknown: 100, pending: 300 })
    ).toEqual({
      success: 6,
      error: 4,
      warning: 5,
    });
  });

  test('should fallback to 0 if any of the expected statuses are absent', () => {
    expect(groupRulesByStatus({ unknown: 100, pending: 300 })).toEqual({
      success: 0,
      error: 0,
      warning: 0,
    });
  });
});

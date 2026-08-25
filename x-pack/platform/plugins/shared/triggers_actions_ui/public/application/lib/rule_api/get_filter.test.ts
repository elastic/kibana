/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilter } from './get_filter';

describe('getFilter', () => {
  test('should return message filter', () => {
    expect(getFilter({ message: 'test message' })).toEqual([
      '(message: "test message" OR error.message: "test message")',
    ]);
  });

  test('should return outcome filter', () => {
    expect(getFilter({ outcomeFilter: ['failure', 'warning', 'success', 'unknown'] })).toEqual([
      '(event.outcome: failure OR kibana.alerting.outcome: warning OR kibana.alerting.outcome:success OR (event.outcome: success AND NOT kibana.alerting.outcome:*) OR event.outcome: unknown)',
    ]);
  });

  test('should return runId filter', () => {
    expect(getFilter({ runId: 'test' })).toEqual(['kibana.alert.rule.execution.uuid: test']);
  });

  test('should return filter for both message and outcome', () => {
    expect(getFilter({ message: 'test message', outcomeFilter: ['failure', 'warning'] })).toEqual([
      '(message: "test message" OR error.message: "test message")',
      '(event.outcome: failure OR kibana.alerting.outcome: warning)',
    ]);
  });

  test('should not return filter if outcome filter is invalid', () => {
    expect(getFilter({ outcomeFilter: ['doesntexist'] })).toEqual([]);
  });

  test('should return ruleTypeId filter', () => {
    expect(getFilter({ ruleTypeIds: ['test-1', 'test-2'] })).toEqual([
      'kibana.alert.rule.rule_type_id:(test-1 or test-2)',
    ]);
  });
});

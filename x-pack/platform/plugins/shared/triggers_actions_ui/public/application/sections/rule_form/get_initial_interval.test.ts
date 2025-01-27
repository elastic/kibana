/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialInterval } from './get_initial_interval';
import { DEFAULT_RULE_INTERVAL } from '../../constants';

describe('getInitialInterval', () => {
  test('should return DEFAULT_RULE_INTERVAL if minimumScheduleInterval is undefined', () => {
    expect(getInitialInterval()).toEqual(DEFAULT_RULE_INTERVAL);
  });

  test('should return DEFAULT_RULE_INTERVAL if minimumScheduleInterval is smaller than or equal to default', () => {
    expect(getInitialInterval('1m')).toEqual(DEFAULT_RULE_INTERVAL);
  });

  test('should return minimumScheduleInterval if minimumScheduleInterval is greater than default', () => {
    expect(getInitialInterval('5m')).toEqual('5m');
  });
});

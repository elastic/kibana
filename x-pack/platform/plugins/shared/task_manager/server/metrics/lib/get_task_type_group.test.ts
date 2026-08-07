/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskTypeGroup } from './get_task_type_group';

describe('getTaskTypeGroup', () => {
  test('should return undefined if prefix is alerting or actions but taskTypeGroup is not set', () => {
    expect(getTaskTypeGroup('alerting:abc', undefined)).toBeUndefined();
    expect(getTaskTypeGroup('actions:def', undefined)).toBeUndefined();
  });

  test('should correctly group ad hoc runs under alerting', () => {
    expect(getTaskTypeGroup('ad_hoc_run-backfill')).toEqual('alerting');
  });

  test('should return taskTypeGroup when it is one of the accepted values', () => {
    expect(getTaskTypeGroup('random:task', 'alerting')).toEqual('alerting');
    expect(getTaskTypeGroup('alerting:abc', 'custom_group')).toBeUndefined();
  });
});

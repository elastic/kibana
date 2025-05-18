/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskTypeGroup } from './get_task_type_group';

describe('getTaskTypeGroup', () => {
  test('should correctly group based on task type prefix', () => {
    expect(getTaskTypeGroup('alerting:abc')).toEqual('alerting');
    expect(getTaskTypeGroup('actions:def')).toEqual('actions');
  });

  test('should return undefined if no match', () => {
    expect(getTaskTypeGroup('alerting-abc')).toBeUndefined();
    expect(getTaskTypeGroup('fooalertingbar')).toBeUndefined();
  });
});

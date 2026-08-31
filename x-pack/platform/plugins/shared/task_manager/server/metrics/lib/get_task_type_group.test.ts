/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskTypeGroup } from './get_task_type_group';
import { TaskTypeGroup } from '../../task';

describe('getTaskTypeGroup', () => {
  test('should return taskTypeGroup when it is one of the accepted values', () => {
    expect(getTaskTypeGroup('alerting')).toEqual(TaskTypeGroup.Alerting);
    expect(getTaskTypeGroup('actions')).toEqual(TaskTypeGroup.Actions);
    expect(getTaskTypeGroup('custom_group')).toBeUndefined();
  });
});

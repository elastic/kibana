/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskTypeGroup } from '../../task';

const taskTypeGrouping = [TaskTypeGroup.Actions, TaskTypeGroup.Alerting];

export function getTaskTypeGroup(taskTypeGroup?: string): TaskTypeGroup | undefined {
  if (taskTypeGroup !== undefined && taskTypeGrouping.includes(taskTypeGroup as TaskTypeGroup)) {
    return taskTypeGroup as TaskTypeGroup;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ALERT_GROUP = 'alerting';
const ACTIONS_GROUP = 'actions';
const taskTypeGrouping = [ALERT_GROUP, ACTIONS_GROUP];

export function getTaskTypeGroup(taskType: string, taskTypeGroup?: string): string | undefined {
  if (taskTypeGroup !== undefined && taskTypeGrouping.includes(taskTypeGroup)) {
    return taskTypeGroup;
  }

  if (taskType === 'ad_hoc_run-backfill') {
    return ALERT_GROUP;
  }
}

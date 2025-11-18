/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ALERT_GROUP = 'alerting';
const ACTIONS_GROUP = 'actions';
const taskTypeGrouping = new Set<string>([`${ALERT_GROUP}:`, `${ACTIONS_GROUP}:`]);

export function getTaskTypeGroup(taskType: string): string | undefined {
  // we want to group ad hoc runs under alerting
  if (taskType === 'ad_hoc_run-backfill') {
    return ALERT_GROUP;
  }

  for (const group of taskTypeGrouping) {
    if (taskType.startsWith(group)) {
      return group.replace(':', '');
    }
  }
}

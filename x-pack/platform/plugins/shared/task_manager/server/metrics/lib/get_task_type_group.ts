/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const taskTypeGrouping = new Set<string>(['alerting:', 'actions:']);

export function getTaskTypeGroup(taskType: string): string | undefined {
  for (const group of taskTypeGrouping) {
    if (taskType.startsWith(group)) {
      return group.replace(':', '');
    }
  }
}

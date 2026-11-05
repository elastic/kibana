/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskTypeSummary } from '@kbn/task-manager-plugin/common';
import { getRunCount } from './format';

const NAME_SEPARATORS = /[-_.]/;

/**
 * The framework that registered a task type (alerting, actions), otherwise the first segment of
 * its name. Task Manager doesn't record which plugin registered a type, so this is a best guess.
 */
export const getTaskTypeArea = (taskType: string, taskTypeGroup?: string): string => {
  if (taskTypeGroup) {
    return taskTypeGroup;
  }
  const [namespace] = taskType.includes(':')
    ? taskType.split(':')
    : taskType.split(NAME_SEPARATORS);
  return (namespace || taskType).toLowerCase();
};

export interface TaskAreaSummary {
  area: string;
  taskTypes: number;
  failingTaskTypes: number;
  tasks: number;
  overdue: number;
  tasksWithFailures: number;
  runs: number;
  failedRuns: number;
  failureRate?: number;
  lastFailureAt?: string;
  lastFailureTaskType?: string;
  lastFailureMessage?: string;
}

const createAreaSummary = (area: string): TaskAreaSummary => ({
  area,
  taskTypes: 0,
  failingTaskTypes: 0,
  tasks: 0,
  overdue: 0,
  tasksWithFailures: 0,
  runs: 0,
  failedRuns: 0,
});

/** Rolls task type counts and run history up by area. */
export const summarizeAreas = (taskTypes: TaskTypeSummary[]): TaskAreaSummary[] => {
  const areas = new Map<string, TaskAreaSummary>();
  for (const { task_type: taskType, definition, tasks, overdue, runs } of taskTypes) {
    const area = getTaskTypeArea(taskType, definition?.task_type_group);
    const summary = areas.get(area) ?? createAreaSummary(area);
    const failedRuns = runs?.failure ?? 0;
    const lastFailure = runs?.last_failure;

    summary.taskTypes += 1;
    summary.failingTaskTypes += failedRuns > 0 ? 1 : 0;
    summary.tasks += tasks;
    summary.overdue += overdue;
    summary.tasksWithFailures += runs?.failed_tasks ?? 0;
    summary.runs += getRunCount(runs);
    summary.failedRuns += failedRuns;
    if (lastFailure && (!summary.lastFailureAt || lastFailure.at > summary.lastFailureAt)) {
      summary.lastFailureAt = lastFailure.at;
      summary.lastFailureTaskType = taskType;
      summary.lastFailureMessage = lastFailure.message;
    }
    areas.set(area, summary);
  }
  return [...areas.values()].map((summary) => ({
    ...summary,
    failureRate: summary.runs > 0 ? summary.failedRuns / summary.runs : undefined,
  }));
};

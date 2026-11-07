/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import type { History } from 'history';
import {
  DEFAULT_RUNS_TIME_RANGE,
  getRunsTimeRangeError,
  type RunsTimeRange,
} from './runs_time_range';

export const OVERVIEW_PATH = '/overview';
const TASKS_PATH = '/tasks';

export type TaskManagerRoute = { tab: 'overview' } | { tab: 'tasks'; taskType?: string };

/** Keeps the colons of task types such as `alerting:.es-query` readable, as paths allow them. */
const encodeTaskType = (taskType: string) => encodeURIComponent(taskType).replace(/%3A/g, ':');

const decodeTaskType = (pathSegment: string) => {
  try {
    return decodeURIComponent(pathSegment);
  } catch {
    return pathSegment;
  }
};

/** The path of the task list, filtered to a task type when one is given. */
export const getTasksPath = (taskType?: string) =>
  taskType ? `/${encodeTaskType(taskType)}` : TASKS_PATH;

/** Reads the tab, and the task type of the task list, from the first segment of the path. */
export const parseRoute = (pathSegment: string): TaskManagerRoute => {
  switch (`/${pathSegment}`) {
    case OVERVIEW_PATH:
      return { tab: 'overview' };
    case TASKS_PATH:
      return { tab: 'tasks' };
    default:
      return { tab: 'tasks', taskType: decodeTaskType(pathSegment) };
  }
};

export const getRoutePath = (route: TaskManagerRoute) =>
  route.tab === 'overview' ? OVERVIEW_PATH : getTasksPath(route.taskType);

/** History v4 decodes pushed paths, so they are encoded once more to keep the escapes of task types. */
export const pushPath = (history: History, path: string, search: string) =>
  history.push({ pathname: encodeURI(path), search });

export const toRunsTimeRangeSearch = ({ start, end }: RunsTimeRange) =>
  `?${new URLSearchParams({ start, end })}`;

/** Reads the run history time range from the URL, or returns the default one when it has none or an invalid one. */
export const parseRunsTimeRangeSearch = (search: string): RunsTimeRange => {
  const params = new URLSearchParams(search);
  const start = params.get('start');
  const end = params.get('end');
  if (start === null || end === null || getRunsTimeRangeError({ start, end })) {
    return DEFAULT_RUNS_TIME_RANGE;
  }
  return { start, end };
};

/** Leaves modified and middle clicks to the browser, so that links can still open in a new tab. */
export const onPlainLeftClick = (callback: () => void) => (event: MouseEvent) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  callback();
};

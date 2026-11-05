/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import type { TaskRunsWindow } from '@kbn/task-manager-plugin/common';

/** Must match the longest run history window that the task manager UI routes accept. */
const MAX_RUNS_WINDOW_DAYS = 30;
const MAX_RUNS_WINDOW_MS = MAX_RUNS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** The run history time range as picked, with date math or ISO 8601 bounds such as `now-24h` to `now`. */
export interface RunsTimeRange {
  start: string;
  end: string;
}

export const DEFAULT_RUNS_TIME_RANGE: RunsTimeRange = { start: 'now-24h', end: 'now' };

const INVALID_TIME_RANGE = i18n.translate('xpack.taskManagerUi.timeRange.invalid', {
  defaultMessage: 'Enter a valid time range.',
});

/** Resolves relative bounds against the current time, or returns undefined when a bound is not a date. */
const resolveRunsTimeRange = ({ start, end }: RunsTimeRange): TaskRunsWindow | undefined => {
  const now = new Date();
  const startDate = datemath.parse(start, { forceNow: now });
  const endDate = datemath.parse(end, { roundUp: true, forceNow: now });
  if (!startDate?.isValid() || !endDate?.isValid()) {
    return undefined;
  }
  return { start: startDate.toISOString(), end: endDate.toISOString() };
};

export const toRunsWindow = (timeRange: RunsTimeRange): TaskRunsWindow => {
  const window = resolveRunsTimeRange(timeRange);
  if (!window) {
    throw new Error(INVALID_TIME_RANGE);
  }
  return window;
};

/** Returns why the run history cannot be shown for a time range, if it cannot. */
export const getRunsTimeRangeError = (timeRange: RunsTimeRange): string | undefined => {
  const window = resolveRunsTimeRange(timeRange);
  if (!window) {
    return INVALID_TIME_RANGE;
  }
  const span = Date.parse(window.end) - Date.parse(window.start);
  if (span <= 0) {
    return i18n.translate('xpack.taskManagerUi.timeRange.endBeforeStart', {
      defaultMessage: 'The end of the time range must be after its start.',
    });
  }
  if (span > MAX_RUNS_WINDOW_MS) {
    return i18n.translate('xpack.taskManagerUi.timeRange.tooLong', {
      defaultMessage: 'Select a time range of {maxDays} days or less.',
      values: { maxDays: MAX_RUNS_WINDOW_DAYS },
    });
  }
};

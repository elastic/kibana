/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TaskRunsWindow } from '../../../common';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_RUNS_WINDOW_MS = MS_PER_DAY;
/** Bounds the event log aggregations. The task manager UI limits its time range picker to the same span. */
const MAX_RUNS_WINDOW_DAYS = 30;

const isoDateSchema = schema.string({
  maxLength: 64,
  validate: (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
      return 'must be an ISO 8601 date in UTC, such as 2026-11-04T10:00:00.000Z';
    }
  },
});

/** Query fields of the run history window, which defaults to the last 24 hours. */
export const runsWindowFields = {
  start: schema.maybe(isoDateSchema),
  end: schema.maybe(isoDateSchema),
};

export interface RunsWindowQuery {
  start?: string;
  end?: string;
}

export const validateRunsWindow = ({ start, end }: RunsWindowQuery): string | undefined => {
  if (start === undefined && end === undefined) {
    return;
  }
  if (start === undefined || end === undefined) {
    return 'start and end must be set together';
  }
  const span = Date.parse(end) - Date.parse(start);
  if (span <= 0) {
    return 'end must be after start';
  }
  if (span > MAX_RUNS_WINDOW_DAYS * MS_PER_DAY) {
    return `start and end must be at most ${MAX_RUNS_WINDOW_DAYS} days apart`;
  }
};

export const toRunsWindow = ({ start, end }: RunsWindowQuery): TaskRunsWindow => {
  if (start !== undefined && end !== undefined) {
    return { start, end };
  }
  const now = Date.now();
  return {
    start: new Date(now - DEFAULT_RUNS_WINDOW_MS).toISOString(),
    end: new Date(now).toISOString(),
  };
};

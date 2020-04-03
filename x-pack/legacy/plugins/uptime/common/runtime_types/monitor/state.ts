/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const CheckMonitorType = t.intersection([
  t.partial({
    name: t.string,
    ip: t.string,
  }),
  t.type({
    status: t.string,
  }),
]);

export const CheckType = t.intersection([
  t.partial({
    container: t.type({
      id: t.string,
    }),
    kubernetes: t.type({
      pod: t.type({
        uid: t.string,
      }),
    }),
  }),
  t.type({
    monitor: CheckMonitorType,
    timestamp: t.string,
  }),
]);

export type Check = t.TypeOf<typeof CheckType>;

export const StateType = t.intersection([
  t.partial({
    checks: t.array(CheckType),
    summary: t.partial({
      up: t.number,
      down: t.number,
      geo: t.partial({
        name: t.string,
        location: t.partial({
          lat: t.number,
          lon: t.number,
        }),
      }),
    }),
  }),
  t.type({
    timestamp: t.number,
    url: t.partial({
      domain: t.string,
      full: t.string,
      path: t.string,
      port: t.number,
      scheme: t.string,
    }),
  }),
]);

export const HistogramPointType = t.type({
  timestamp: t.number,
  up: t.number,
  down: t.number,
});

export type HistogramPoint = t.TypeOf<typeof HistogramPointType>;

export const HistogramType = t.type({
  count: t.number,
  points: t.array(HistogramPointType),
});

export type Histogram = t.TypeOf<typeof HistogramType>;

export const MonitorSummaryType = t.intersection([
  t.type({
    monitor_id: t.string,
    state: StateType,
  }),
  t.partial({
    histogram: HistogramType,
  }),
]);

export type MonitorSummary = t.TypeOf<typeof MonitorSummaryType>;

export const MonitorSummaryResultType = t.intersection([
  t.partial({
    prevPagePagination: t.string,
    nextPagePagination: t.string,
    summaries: t.array(MonitorSummaryType),
  }),
  t.type({
    totalSummaryCount: t.number,
  }),
]);

export type MonitorSummaryResult = t.TypeOf<typeof MonitorSummaryResultType>;

export const FetchMonitorStatesQueryArgsType = t.intersection([
  t.partial({
    pagination: t.string,
    filters: t.string,
    statusFilter: t.string,
  }),
  t.type({
    dateRangeStart: t.string,
    dateRangeEnd: t.string,
  }),
]);

export enum CursorDirection {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

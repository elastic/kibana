/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import {
  badRequestErrorRT,
  forbiddenErrorRT,
  timeRangeRT,
  routeTimingMetadataRT,
} from '../../shared';

export const LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH =
  '/api/infra/log_analysis/results/log_entry_categories';

/**
 * request
 */

export const getLogEntryCategoriesRequestPayloadRT = rt.type({
  data: rt.intersection([
    rt.type({
      // bucketDuration: rt.number,
      categoryCount: rt.number,
      sourceId: rt.string,
      timeRange: timeRangeRT,
    }),
    rt.partial({
      datasets: rt.array(rt.string),
    }),
  ]),
});

export type GetLogEntryCategoriesRequestPayload = rt.TypeOf<
  typeof getLogEntryCategoriesRequestPayloadRT
>;

/**
 * response
 */

export const logEntryCategoryRT = rt.type({
  categoryId: rt.number,
  datasets: rt.array(rt.string),
  logEntryCount: rt.number,
  regularExpression: rt.string,
});

export type LogEntryCategory = rt.TypeOf<typeof logEntryCategoryRT>;

export const getLogEntryCategoriesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      // bucketDuration: rt.number,
      categories: rt.array(logEntryCategoryRT),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryCategoriesSuccessResponsePayload = rt.TypeOf<
  typeof getLogEntryCategoriesSuccessReponsePayloadRT
>;

export const getLogEntryCategoriesResponsePayloadRT = rt.union([
  getLogEntryCategoriesSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryCategoriesReponsePayload = rt.TypeOf<
  typeof getLogEntryCategoriesResponsePayloadRT
>;

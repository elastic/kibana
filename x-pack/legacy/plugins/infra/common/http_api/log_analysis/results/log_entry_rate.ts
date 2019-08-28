/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import {
  badRequestErrorRT,
  conflictErrorRT,
  forbiddenErrorRT,
  metricStatisticsRT,
  timeRangeRT,
} from '../../shared';

export const LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH =
  '/api/infra/log_analysis/results/log_entry_rate';

/**
 * request
 */

export const getLogEntryRateRequestPayloadRT = rt.type({
  data: rt.type({
    bucketDuration: rt.number,
    sourceId: rt.string,
    timeRange: timeRangeRT,
  }),
});

export type GetLogEntryRateRequestPayload = rt.TypeOf<typeof getLogEntryRateRequestPayloadRT>;

/**
 * response
 */

export const logEntryRateAnomaly = rt.type({
  actualLogEntryRate: rt.number,
  anomalyScore: rt.number,
  duration: rt.number,
  startTime: rt.number,
  typicalLogEntryRate: rt.number,
});

export const logEntryRateHistogramBucket = rt.type({
  anomalies: rt.array(logEntryRateAnomaly),
  duration: rt.number,
  logEntryRateStats: metricStatisticsRT,
  modelLowerBoundStats: metricStatisticsRT,
  modelUpperBoundStats: metricStatisticsRT,
  startTime: rt.number,
});

export const getLogEntryRateSuccessReponsePayloadRT = rt.type({
  data: rt.type({
    bucketDuration: rt.number,
    histogramBuckets: rt.array(logEntryRateHistogramBucket),
  }),
});

export type GetLogEntryRateSuccessResponsePayload = rt.TypeOf<
  typeof getLogEntryRateSuccessReponsePayloadRT
>;

export const getLogEntryRateResponsePayloadRT = rt.union([
  getLogEntryRateSuccessReponsePayloadRT,
  badRequestErrorRT,
  conflictErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryRateReponsePayload = rt.TypeOf<typeof getLogEntryRateResponsePayloadRT>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverADAnomalyRange } from '@kbn/ml-ui-actions';
import type { MlApi } from '../application/services/ml_api_service';

const MIN_ANOMALY_SCORE = 3;
const DEFAULT_CHART_WIDTH = 800;
const MIN_BUCKET_WIDTH_PX = 8;

/**
 * The size of the anomaly buckets: wide enough for each to be visible on the chart, and a
 * multiple of the longest bucket span of the jobs, as the overall buckets API requires.
 */
export const getAnomalyBucketSeconds = ({
  timeRange,
  chartWidth = DEFAULT_CHART_WIDTH,
  bucketSpansSeconds,
}: {
  timeRange: { from: number; to: number };
  chartWidth?: number;
  bucketSpansSeconds: number[];
}): number => {
  const maxBucketSpan = Math.max(1, ...bucketSpansSeconds);
  const spanSeconds = Math.max(1, (timeRange.to - timeRange.from) / 1000);
  const maxBuckets = Math.max(1, Math.floor(chartWidth / MIN_BUCKET_WIDTH_PX));
  return Math.ceil(spanSeconds / maxBuckets / maxBucketSpan) * maxBucketSpan;
};

/**
 * Loads the time ranges, within the time range, in which the job found anomalies.
 */
export const loadAnomalyRanges = async ({
  mlApi,
  jobId,
  timeRange,
  chartWidth,
}: {
  mlApi: MlApi;
  jobId: string;
  timeRange: { from: number; to: number };
  chartWidth?: number;
}): Promise<DiscoverADAnomalyRange[]> => {
  // The summaries are not always limited to the job which was asked for
  const job = (await mlApi.jobs.jobsSummary([jobId])).find(({ id }) => id === jobId);
  if (!job) {
    return [];
  }

  const bucketSeconds = getAnomalyBucketSeconds({
    timeRange,
    chartWidth,
    bucketSpansSeconds: [job.bucketSpanSeconds],
  });

  const { overall_buckets: overallBuckets } = await mlApi.overallBuckets({
    jobId: [job.id],
    topN: 1,
    bucketSpan: `${bucketSeconds}s`,
    start: timeRange.from,
    end: timeRange.to,
    overallScore: MIN_ANOMALY_SCORE,
  });

  return (overallBuckets ?? [])
    .filter(({ overall_score: score }) => score >= MIN_ANOMALY_SCORE)
    .map(({ timestamp, overall_score: score }) => ({
      jobId: job.id,
      start: timestamp,
      end: timestamp + bucketSeconds * 1000,
      score,
    }));
};

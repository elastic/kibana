/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, ScoutWorkerFixtures } from '@kbn/scout';
import { FAREQUOTE_INDEX } from './farequote_saved_searches';
import { deleteAnomalyJob } from './embeddable_cancellation';

type EsClient = ScoutWorkerFixtures['esClient'];

type AnomalyJobConfig = Parameters<
  ApiServicesFixture['ml']['anomalyDetection']['createViaKibana']
>[0];

type DatafeedConfig = Parameters<ApiServicesFixture['ml']['datafeeds']['create']>[0] & {
  esql_query?: string;
  source_time_field?: string;
  grouping_interval?: string;
};

export const FAREQUOTE_TIME_RANGE = {
  from: '2016-02-07T00:00:00.000Z',
  to: '2016-02-12T00:00:00.000Z',
} as const;

const BUCKET_SPAN = '15m';

/** A DSL job and an ES|QL job that model the same data, so their charts must match. */
export interface ComparableJobPair {
  readonly label: string;
  readonly dslJob: AnomalyJobConfig;
  readonly dslDatafeed: DatafeedConfig;
  readonly esqlJob: AnomalyJobConfig;
  readonly esqlDatafeed: DatafeedConfig;
  readonly entities?: Readonly<Record<string, string>>;
}

const baseJob = (
  jobId: string,
  description: string,
  analysisConfig: AnomalyJobConfig['analysis_config'],
  timeField: string
): AnomalyJobConfig => ({
  job_id: jobId,
  description,
  analysis_config: analysisConfig,
  data_description: { time_field: timeField },
  analysis_limits: { model_memory_limit: '20mb' },
  // Model plot is off so the viewer charts source data, which for ES|QL jobs runs the ES|QL query.
  model_plot_config: { enabled: false },
});

const dslDatafeed = (jobId: string): DatafeedConfig => ({
  datafeed_id: `datafeed-${jobId}`,
  job_id: jobId,
  indices: [FAREQUOTE_INDEX],
  query: { match_all: {} },
});

const esqlDatafeed = (
  jobId: string,
  esqlQuery: string,
  delayedDataCheck: boolean
): DatafeedConfig => ({
  datafeed_id: `datafeed-${jobId}`,
  job_id: jobId,
  esql_query: esqlQuery,
  source_time_field: '@timestamp',
  grouping_interval: BUCKET_SPAN,
  // The delayed data check needs a count column, which raw-row queries do not have.
  ...(delayedDataCheck ? {} : { delayed_data_check_config: { enabled: false } }),
});

/** Builds job ids that are unique to the Scout space so parallel workers do not collide. */
export const esqlJobId = (spaceId: string, label: string, kind: 'dsl' | 'esql'): string => {
  const compact = spaceId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  return `fq_${kind}_${label}_${compact || 'space'}`;
};

export interface ComparableJobPairs {
  readonly count: ComparableJobPair;
  readonly mean: ComparableJobPair;
  readonly partitionedMean: ComparableJobPair;
}

export const getComparableJobPairs = (spaceId: string): ComparableJobPairs => {
  const countDsl = esqlJobId(spaceId, 'count', 'dsl');
  const countEsql = esqlJobId(spaceId, 'count', 'esql');
  const meanDsl = esqlJobId(spaceId, 'mean', 'dsl');
  const meanEsql = esqlJobId(spaceId, 'mean', 'esql');
  const partitionDsl = esqlJobId(spaceId, 'airline', 'dsl');
  const partitionEsql = esqlJobId(spaceId, 'airline', 'esql');

  return {
    count: {
      // The ES|QL query pre-aggregates with STATS, so the viewer plots sum(event_count).
      label: 'count with an aggregated ES|QL query',
      dslJob: baseJob(
        countDsl,
        'count on farequote',
        { bucket_span: BUCKET_SPAN, detectors: [{ function: 'count' }], influencers: [] },
        '@timestamp'
      ),
      dslDatafeed: dslDatafeed(countDsl),
      esqlJob: baseJob(
        countEsql,
        'count on farequote, ES|QL STATS datafeed',
        {
          bucket_span: BUCKET_SPAN,
          summary_count_field_name: 'event_count',
          detectors: [{ function: 'count' }],
          influencers: [],
        },
        'bucket_time'
      ),
      esqlDatafeed: esqlDatafeed(
        countEsql,
        `FROM ${FAREQUOTE_INDEX} | STATS event_count = COUNT(*) BY bucket_time = BUCKET(@timestamp, 15 minutes)`,
        true
      ),
    },
    mean: {
      label: 'mean with a raw-row ES|QL query',
      dslJob: baseJob(
        meanDsl,
        'mean(responsetime) on farequote',
        {
          bucket_span: BUCKET_SPAN,
          detectors: [{ function: 'mean', field_name: 'responsetime' }],
          influencers: [],
        },
        '@timestamp'
      ),
      dslDatafeed: dslDatafeed(meanDsl),
      esqlJob: baseJob(
        meanEsql,
        'mean(responsetime) on farequote, ES|QL raw-row datafeed',
        {
          bucket_span: BUCKET_SPAN,
          detectors: [{ function: 'mean', field_name: 'responsetime' }],
          influencers: [],
        },
        '@timestamp'
      ),
      esqlDatafeed: esqlDatafeed(
        meanEsql,
        `FROM ${FAREQUOTE_INDEX} | KEEP @timestamp, responsetime`,
        false
      ),
    },
    partitionedMean: {
      // Exercises the entity filter added to the ES|QL chart query.
      label: 'mean partitioned by airline',
      dslJob: baseJob(
        partitionDsl,
        'mean(responsetime) partition by airline on farequote',
        {
          bucket_span: BUCKET_SPAN,
          detectors: [
            { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
          ],
          influencers: ['airline'],
        },
        '@timestamp'
      ),
      dslDatafeed: dslDatafeed(partitionDsl),
      esqlJob: baseJob(
        partitionEsql,
        'mean(responsetime) partition by airline on farequote, ES|QL raw-row datafeed',
        {
          bucket_span: BUCKET_SPAN,
          detectors: [
            { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
          ],
          influencers: ['airline'],
        },
        '@timestamp'
      ),
      esqlDatafeed: esqlDatafeed(
        partitionEsql,
        `FROM ${FAREQUOTE_INDEX} | KEEP @timestamp, responsetime, airline`,
        false
      ),
      entities: { airline: 'AAL' },
    },
  };
};

/** Creates a job and datafeed through Kibana, then runs the datafeed over the farequote data. */
export const createAndRunJob = async (
  apiServices: ApiServicesFixture,
  esClient: EsClient,
  job: AnomalyJobConfig,
  datafeed: DatafeedConfig,
  spaceId: string
): Promise<void> => {
  const { job_id: jobId } = job;
  const { datafeed_id: datafeedId } = datafeed;
  if (!jobId || !datafeedId) {
    throw new Error('job_id and datafeed_id are required');
  }

  await deleteAnomalyJob(esClient, jobId);
  await apiServices.ml.anomalyDetection.createViaKibana(job, spaceId);
  await apiServices.ml.datafeeds.create(datafeed, spaceId);
  await apiServices.ml.anomalyDetection.openJob(jobId);
  await apiServices.ml.anomalyDetection.waitForJobState(jobId, 'opened');
  await apiServices.ml.datafeeds.start(datafeedId, {
    start: FAREQUOTE_TIME_RANGE.from,
    end: FAREQUOTE_TIME_RANGE.to,
  });
  await apiServices.ml.datafeeds.waitForState(datafeedId, 'stopped');
  await apiServices.ml.anomalyDetection.waitForJobRecordCountToBePositive(jobId);
  await apiServices.ml.anomalyDetection.closeJob(jobId);
  await apiServices.ml.anomalyDetection.waitForJobState(jobId, 'closed');
};

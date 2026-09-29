/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EsqlDatafeedConfig,
  DatafeedId,
} from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type {
  BucketSpan,
  Detector,
  EsqlJobConfig,
  JobId,
} from '@kbn/ml-common-types/anomaly_detection_jobs/job';

type FixedBucketSpan = Exclude<BucketSpan, -1 | 0>;

export interface EsqlJobPayloadInput {
  jobId: JobId;
  datafeedId: DatafeedId;
  query: string;
  sourceTimeField: string;
  timeField: string;
  bucketSpan: FixedBucketSpan;
  detectors: Detector[];
  influencers: string[];
  summaryCountFieldName?: string;
  delayedDataCheckEnabled?: boolean;
}

export interface EsqlJobPayload {
  job: EsqlJobConfig;
  datafeed: EsqlDatafeedConfig;
}

export const createMeanDetectors = (fieldNames: string[]): Detector[] =>
  fieldNames.map((fieldName) => ({ function: 'mean', field_name: fieldName }));

export const buildEsqlJobPayload = ({
  jobId,
  datafeedId,
  query,
  sourceTimeField,
  timeField,
  bucketSpan,
  detectors,
  influencers,
  summaryCountFieldName,
  delayedDataCheckEnabled,
}: EsqlJobPayloadInput): EsqlJobPayload => {
  const analysisConfig: EsqlJobConfig['analysis_config'] = {
    bucket_span: bucketSpan,
    detectors,
    influencers,
  };

  if (summaryCountFieldName !== undefined) {
    analysisConfig.summary_count_field_name = summaryCountFieldName;
  }

  const datafeed: EsqlDatafeedConfig = {
    datafeed_id: datafeedId,
    job_id: jobId,
    esql_query: query,
    source_time_field: sourceTimeField,
    grouping_interval: bucketSpan,
  };

  if (delayedDataCheckEnabled !== undefined) {
    datafeed.delayed_data_check_config = { enabled: delayedDataCheckEnabled };
  }

  return {
    job: {
      job_id: jobId,
      analysis_config: analysisConfig,
      data_description: { time_field: timeField },
    },
    datafeed,
  };
};

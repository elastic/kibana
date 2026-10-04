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
  description?: string;
  groups?: string[];
}

export interface EsqlJobPayload {
  job: EsqlJobConfig;
  datafeed: EsqlDatafeedConfig;
}

/**
 * Per-detector configuration collected by the ES|QL wizard's detector
 * editor. `byField`/`overField`/`partitionField` exist so the staged
 * PICK_FIELDS wizard step (g2sz.10) can populate them without another type
 * change; the current wizard UI never sets them.
 */
export interface EsqlDetectorConfig {
  function: string;
  field?: string;
  byField?: string;
  overField?: string;
  partitionField?: string;
}

export const createDetectors = (detectors: EsqlDetectorConfig[]): Detector[] =>
  detectors.map(({ function: detectorFunction, field, byField, overField, partitionField }) => {
    const detector: Detector = { function: detectorFunction };

    if (field !== undefined) detector.field_name = field;
    if (byField !== undefined) detector.by_field_name = byField;
    if (overField !== undefined) detector.over_field_name = overField;
    if (partitionField !== undefined) detector.partition_field_name = partitionField;

    return detector;
  });

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
  description,
  groups,
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

  const job: EsqlJobPayload['job'] = {
    job_id: jobId,
    analysis_config: analysisConfig,
    data_description: { time_field: timeField },
  };

  if (description !== undefined && description !== '') {
    job.description = description;
  }

  if (groups !== undefined && groups.length > 0) {
    job.groups = groups;
  }

  return {
    job,
    datafeed,
  };
};

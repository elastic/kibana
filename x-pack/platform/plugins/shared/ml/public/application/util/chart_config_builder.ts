/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Builds the configuration object used to plot a chart showing anomalies
 * in the source metric data.
 */

import { get } from 'lodash';

import { ES_AGGREGATION, ML_JOB_AGGREGATION, DOC_COUNT, _DOC_COUNT } from '@kbn/ml-anomaly-utils';

import type { SeriesConfig } from '../../../common/types/results';
import type { Job } from '../../../common/types/anomaly_detection_jobs';

import { mlFunctionToESAggregation } from '../../../common/util/job_utils';

/**
 * Builds the basic configuration to plot a chart of the source data
 * analyzed by the the detector at the given index from the specified ML job.
 * @param job Job config info
 * @param detectorIndex The index of the detector in the job config
 * @param metricFunctionDescription The underlying function (min, max, avg) for "metric" detector type
 * @returns
 */
export function buildConfigFromDetector(
  job: Job,
  detectorIndex: number,
  metricFunctionDescription?: ES_AGGREGATION
) {
  const analysisConfig = job.analysis_config;
  const detector = analysisConfig.detectors[detectorIndex];

  const config: SeriesConfig = {
    jobId: job.job_id,
    detectorIndex,
    metricFunction:
      detector.function === ML_JOB_AGGREGATION.LAT_LONG
        ? ML_JOB_AGGREGATION.LAT_LONG
        : mlFunctionToESAggregation(detector.function),
    timeField: job.data_description.time_field!,
    // @ts-expect-error bucket_span is of type estypes.Duration
    interval: job.analysis_config.bucket_span,
    datafeedConfig: job.datafeed_config!,
    summaryCountFieldName: job.analysis_config.summary_count_field_name,
  };
  if (detector.function === ML_JOB_AGGREGATION.METRIC && metricFunctionDescription !== undefined) {
    config.metricFunction = metricFunctionDescription;
  }

  if (detector.field_name !== undefined) {
    config.metricFieldName = detector.field_name;
  }

  // Extra checks if the job config uses a summary count field.
  const summaryCountFieldName = analysisConfig.summary_count_field_name;
  if (
    config.metricFunction === ES_AGGREGATION.COUNT &&
    summaryCountFieldName !== undefined &&
    summaryCountFieldName !== DOC_COUNT &&
    summaryCountFieldName !== _DOC_COUNT
  ) {
    // Check for a detector looking at cardinality (distinct count) using an aggregation.
    // The cardinality field will be in:
    // aggregations/<agg_name>/aggregations/<summaryCountFieldName>/cardinality/field
    // or aggs/<agg_name>/aggs/<summaryCountFieldName>/cardinality/field
    let cardinalityField;
    const topAgg = get(job.datafeed_config, 'aggregations') || get(job.datafeed_config, 'aggs');
    if (topAgg !== undefined && Object.values(topAgg).length > 0) {
      cardinalityField =
        get(Object.values(topAgg)[0], [
          'aggregations',
          summaryCountFieldName,
          ES_AGGREGATION.CARDINALITY,
          'field',
        ]) ||
        get(Object.values(topAgg)[0], [
          'aggs',
          summaryCountFieldName,
          ES_AGGREGATION.CARDINALITY,
          'field',
        ]);
    }
    if (
      (detector.function === ML_JOB_AGGREGATION.NON_ZERO_COUNT ||
        detector.function === ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT ||
        detector.function === ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT ||
        detector.function === ML_JOB_AGGREGATION.COUNT ||
        detector.function === ML_JOB_AGGREGATION.HIGH_COUNT ||
        detector.function === ML_JOB_AGGREGATION.LOW_COUNT) &&
      cardinalityField !== undefined
    ) {
      config.metricFunction = ES_AGGREGATION.CARDINALITY;
      config.metricFieldName = undefined;
    } else {
      // For count detectors using summary_count_field, plot sum(summary_count_field_name)
      config.metricFunction = ES_AGGREGATION.SUM;
      config.metricFieldName = summaryCountFieldName;
    }
  }

  return config;
}

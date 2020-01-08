/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Builds the configuration object used to plot a chart showing anomalies
 * in the source metric data.
 */

import _ from 'lodash';

import { mlFunctionToESAggregation } from '../../../common/util/job_utils';

// Builds the basic configuration to plot a chart of the source data
// analyzed by the the detector at the given index from the specified ML job.
export function buildConfigFromDetector(job, detectorIndex) {
  const analysisConfig = job.analysis_config;
  const detector = analysisConfig.detectors[detectorIndex];

  const config = {
    jobId: job.job_id,
    detectorIndex: detectorIndex,
    metricFunction: mlFunctionToESAggregation(detector.function),
    timeField: job.data_description.time_field,
    interval: job.analysis_config.bucket_span,
    datafeedConfig: job.datafeed_config,
  };

  if (detector.field_name !== undefined) {
    config.metricFieldName = detector.field_name;
  }

  // Extra checks if the job config uses a summary count field.
  const summaryCountFieldName = analysisConfig.summary_count_field_name;
  if (
    config.metricFunction === 'count' &&
    summaryCountFieldName !== undefined &&
    summaryCountFieldName !== 'doc_count'
  ) {
    // Check for a detector looking at cardinality (distinct count) using an aggregation.
    // The cardinality field will be in:
    // aggregations/<agg_name>/aggregations/<summaryCountFieldName>/cardinality/field
    // or aggs/<agg_name>/aggs/<summaryCountFieldName>/cardinality/field
    let cardinalityField = undefined;
    const topAgg = _.get(job.datafeed_config, 'aggregations') || _.get(job.datafeed_config, 'aggs');
    if (topAgg !== undefined && _.values(topAgg).length > 0) {
      cardinalityField =
        _.get(_.values(topAgg)[0], [
          'aggregations',
          summaryCountFieldName,
          'cardinality',
          'field',
        ]) || _.get(_.values(topAgg)[0], ['aggs', summaryCountFieldName, 'cardinality', 'field']);
    }

    if (detector.function === 'non_zero_count' && cardinalityField !== undefined) {
      config.metricFunction = 'cardinality';
      config.metricFieldName = cardinalityField;
    } else {
      // For count detectors using summary_count_field, plot sum(summary_count_field_name)
      config.metricFunction = 'sum';
      config.metricFieldName = summaryCountFieldName;
    }
  }

  return config;
}

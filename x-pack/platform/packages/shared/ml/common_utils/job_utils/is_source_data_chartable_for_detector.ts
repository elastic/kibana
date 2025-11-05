/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils/aggregation_types';
import { MLCATEGORY } from '@kbn/ml-anomaly-utils/field_types';

import { getAggregations, getDatafeedAggregations } from '../datafeed_utils';
import { findAggField } from '../validation_utils';
import { getFirstKeyInObject } from '../object_utils';
import { mlFunctionToESAggregation } from './ml_function_to_es_aggregation';
import { isUnsupportedAggType } from './is_unsupported_agg_type';
import { hasValidComposite } from './has_valid_composite';

// Returns a flag to indicate whether the source data can be plotted in a time
// series chart for the specified detector.
export function isSourceDataChartableForDetector(job: CombinedJob, detectorIndex: number): boolean {
  let isSourceDataChartable = false;
  const { detectors } = job.analysis_config;
  if (detectorIndex >= 0 && detectorIndex < detectors.length) {
    const dtr = detectors[detectorIndex];
    const functionName = dtr.function as ML_JOB_AGGREGATION;

    // Check that the function maps to an ES aggregation,
    // and that the partitioning field isn't mlcategory
    // (since mlcategory is a derived field which won't exist in the source data).
    // Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
    // whereas the 'function_description' field holds an ML-built display hint for function e.g. 'count'.
    isSourceDataChartable =
      mlFunctionToESAggregation(functionName) !== null &&
      dtr.by_field_name !== MLCATEGORY &&
      dtr.partition_field_name !== MLCATEGORY &&
      dtr.over_field_name !== MLCATEGORY;

    const hasDatafeed = isPopulatedObject(job.datafeed_config);

    if (isSourceDataChartable && hasDatafeed) {
      // Perform extra check to see if the detector is using a scripted field.
      if (isPopulatedObject(job.datafeed_config.script_fields)) {
        // If the datafeed uses script fields, we can only plot the time series if
        // model plot is enabled. Without model plot it will be very difficult or impossible
        // to invert to a reverse search of the underlying metric data.

        const scriptFields = Object.keys(job.datafeed_config.script_fields);
        return (
          scriptFields.indexOf(dtr.partition_field_name!) === -1 &&
          scriptFields.indexOf(dtr.by_field_name!) === -1 &&
          scriptFields.indexOf(dtr.over_field_name!) === -1
        );
      }

      // We cannot plot the source data for some specific aggregation configurations
      const aggs = getDatafeedAggregations(job.datafeed_config);
      if (isPopulatedObject(aggs)) {
        const aggBucketsName = getFirstKeyInObject(aggs);
        if (aggBucketsName !== undefined) {
          if (Object.keys(aggs[aggBucketsName]).some(isUnsupportedAggType)) {
            return false;
          }
          // if fieldName is an aggregated field under nested terms using bucket_script
          const aggregations =
            getAggregations<estypes.AggregationsAggregationContainer>(aggs[aggBucketsName]) ?? {};
          const foundField = findAggField(aggregations, dtr.field_name, false);
          if (foundField?.bucket_script !== undefined) {
            return false;
          }

          // composite sources should be terms and date_histogram only for now
          return hasValidComposite(aggregations);
        }
      }

      return true;
    }
  }

  return isSourceDataChartable;
}

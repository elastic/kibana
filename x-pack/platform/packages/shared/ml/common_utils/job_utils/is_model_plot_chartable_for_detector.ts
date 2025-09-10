/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils/aggregation_types';

import { mlFunctionToESAggregation } from './ml_function_to_es_aggregation';

// Returns a flag to indicate whether model plot data can be plotted in a time
// series chart for the specified detector.
export function isModelPlotChartableForDetector(job: Job, detectorIndex: number): boolean {
  let isModelPlotChartable = false;

  const modelPlotEnabled = job.model_plot_config?.enabled ?? false;
  const { detectors } = job.analysis_config;
  if (detectorIndex >= 0 && detectorIndex < detectors.length && modelPlotEnabled) {
    const dtr = detectors[detectorIndex];
    const functionName = dtr.function as ML_JOB_AGGREGATION;

    // Model plot can be charted for any of the functions which map to ES aggregations
    // (except rare, for which no model plot results are generated),
    // plus varp and info_content functions.
    isModelPlotChartable =
      functionName !== ML_JOB_AGGREGATION.RARE &&
      (mlFunctionToESAggregation(functionName) !== null ||
        [
          ML_JOB_AGGREGATION.VARP,
          ML_JOB_AGGREGATION.HIGH_VARP,
          ML_JOB_AGGREGATION.LOW_VARP,
          ML_JOB_AGGREGATION.INFO_CONTENT,
          ML_JOB_AGGREGATION.HIGH_INFO_CONTENT,
          ML_JOB_AGGREGATION.LOW_INFO_CONTENT,
        ].includes(functionName));
  }

  return isModelPlotChartable;
}

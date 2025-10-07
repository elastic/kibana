/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

import { isSourceDataChartableForDetector } from './is_source_data_chartable_for_detector';
import { isModelPlotChartableForDetector } from './is_model_plot_chartable_for_detector';

// Returns a flag to indicate whether the detector at the index in the specified job
// is suitable for viewing in the Time Series dashboard.
export function isTimeSeriesViewDetector(job: CombinedJob, detectorIndex: number): boolean {
  return (
    isSourceDataChartableForDetector(job, detectorIndex) ||
    isModelPlotChartableForDetector(job, detectorIndex)
  );
}

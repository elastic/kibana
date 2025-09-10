/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

import { getSingleMetricViewerJobErrorMessage } from './get_single_metric_viewer_job_error_message';

export function isTimeSeriesViewJob(job: CombinedJob): boolean {
  return getSingleMetricViewerJobErrorMessage(job) === undefined;
}

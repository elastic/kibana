/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';

/** The jobs whose datafeed reads an index which is, or together make up, the index pattern. */
export const filterJobsByIndex = (jobs: MlSummaryJob[], indexPattern: string): MlSummaryJob[] =>
  jobs.filter(
    ({ datafeedIndices }) =>
      datafeedIndices.includes(indexPattern) || datafeedIndices.join(',') === indexPattern
  );

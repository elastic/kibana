/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';

export const isManagedJob = (job: MlSummaryJob | MlJob) => {
  return (
    (isPopulatedObject(job, ['customSettings']) && job.customSettings.managed === true) ||
    (isPopulatedObject(job, ['custom_settings']) && job.custom_settings.managed === true)
  );
};

/**
 * When the jobs summary API includes `projectRouting: null`, show a legacy CPS indicator in the UI.
 */
export const showCPSLegacyBadge = (job: MlSummaryJob | MlJob): boolean => {
  // disabled for now while we decide if we want a badge
  return false;
  if (!('projectRouting' in job)) {
    return false;
  }
  return (job as MlSummaryJob).projectRouting === null;
};

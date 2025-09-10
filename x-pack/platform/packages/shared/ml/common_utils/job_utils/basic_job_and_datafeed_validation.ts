/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';

import { getDatafeedAggregations } from '../datafeed_utils';
import type { ValidationResults } from './validation_results';

export function basicJobAndDatafeedValidation(job: Job, datafeed: Datafeed): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;

  if (datafeed && job) {
    const datafeedAggregations = getDatafeedAggregations(datafeed);

    if (datafeedAggregations !== undefined && !job.analysis_config?.summary_count_field_name) {
      valid = false;
      messages.push({ id: 'missing_summary_count_field_name' });
    }
  }

  return {
    messages,
    valid,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

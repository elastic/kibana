/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlServerLimits } from '@kbn/ml-common-types/ml_server_info';

import type { ValidationResults } from './validation_results';

export function validateModelMemoryLimit(job: Job, limits: MlServerLimits): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;
  // model memory limit
  if (
    typeof job.analysis_limits !== 'undefined' &&
    typeof job.analysis_limits.model_memory_limit !== 'undefined'
  ) {
    if (typeof limits === 'object' && typeof limits.max_model_memory_limit !== 'undefined') {
      const max = limits.max_model_memory_limit.toUpperCase();
      const mml = (job.analysis_limits.model_memory_limit as string | undefined)?.toUpperCase();

      // @ts-ignore
      const mmlBytes = numeral(mml).value();
      // @ts-ignore
      const maxBytes = numeral(max).value();

      if (mmlBytes > maxBytes) {
        messages.push({ id: 'model_memory_limit_invalid' });
        valid = false;
      } else {
        messages.push({ id: 'model_memory_limit_valid' });
      }
    }
  }
  return {
    valid,
    messages,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

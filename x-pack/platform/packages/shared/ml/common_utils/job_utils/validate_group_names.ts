/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { maxLengthValidator, JOB_ID_MAX_LENGTH } from '@kbn/ml-validators';

import type { ValidationResults } from './validation_results';
import { isJobIdValid } from './is_job_id_valid';

export function validateGroupNames(job: Job): ValidationResults {
  const { groups = [] } = job;
  const errorMessages: ValidationResults['messages'] = [
    ...(groups.some((group) => !isJobIdValid(group)) ? [{ id: 'job_group_id_invalid' }] : []),
    ...(groups.some((group) => maxLengthValidator(JOB_ID_MAX_LENGTH)(group))
      ? [{ id: 'job_group_id_invalid_max_length' }]
      : []),
  ];
  const valid = errorMessages.length === 0;
  const messages = valid && groups.length ? [{ id: 'job_group_id_valid' }] : errorMessages;

  return {
    valid,
    messages,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

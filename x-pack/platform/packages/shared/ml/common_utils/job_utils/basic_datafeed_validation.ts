/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';

import type { ValidationResults } from './validation_results';
import { parseTimeIntervalForJob } from './parse_time_interval_for_job';

// Checks that the value for a field which represents a time interval,
// such as a job bucket span or datafeed query delay, is valid.
function isValidTimeInterval(value: string | number | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  return parseTimeIntervalForJob(value) !== null;
}

export function basicDatafeedValidation(datafeed: Datafeed): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;

  if (datafeed) {
    let queryDelayMessage = { id: 'query_delay_valid' };
    if (isValidTimeInterval(datafeed.query_delay) === false) {
      queryDelayMessage = { id: 'query_delay_invalid' };
      valid = false;
    }
    messages.push(queryDelayMessage);

    let frequencyMessage = { id: 'frequency_valid' };
    if (isValidTimeInterval(datafeed.frequency) === false) {
      frequencyMessage = { id: 'frequency_invalid' };
      valid = false;
    }
    messages.push(frequencyMessage);
  }

  return {
    messages,
    valid,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { ES_FIELD_TYPES } from '../../../../../../../src/plugins/data/server';
import { parseInterval } from '../../../common/util/parse_interval';
import { validateJobObject } from './validate_job_object';

const BUCKET_SPAN_COMPARE_FACTOR = 25;
const MIN_TIME_SPAN_MS = 7200000;
const MIN_TIME_SPAN_READABLE = '2 hours';

export async function isValidTimeField(callWithRequest, job) {
  const index = job.datafeed_config.indices.join(',');
  const timeField = job.data_description.time_field;

  // check if time_field is of type 'date'
  const fieldCaps = await callWithRequest('fieldCaps', {
    index,
    fields: [timeField],
  });
  // get the field's type with the following notation
  // because a nested field could contain dots and confuse _.get
  const fieldType = _.get(fieldCaps, `fields['${timeField}'].date.type`);
  return fieldType === ES_FIELD_TYPES.DATE;
}

export async function validateTimeRange(callWithRequest, job, duration) {
  const messages = [];

  validateJobObject(job);

  // check if time_field is of type 'date'
  if (!(await isValidTimeField(callWithRequest, job))) {
    messages.push({
      id: 'time_field_invalid',
      timeField: job.data_description.time_field,
    });
    // if the time field is invalid, skip all other checks
    return Promise.resolve(messages);
  }

  // if there is no duration, do not run the estimate test
  if (
    typeof duration === 'undefined' ||
    typeof duration.start === 'undefined' ||
    typeof duration.end === 'undefined'
  ) {
    return Promise.resolve(messages);
  }

  // check if time range is after the Unix epoch start
  if (duration.start < 0 || duration.end < 0) {
    messages.push({ id: 'time_range_before_epoch' });
  }

  // check for minimum time range (25 buckets or 2 hours, whichever is longer)
  const bucketSpan = parseInterval(job.analysis_config.bucket_span).valueOf();
  const minTimeSpanBasedOnBucketSpan = bucketSpan * BUCKET_SPAN_COMPARE_FACTOR;
  const timeSpan = duration.end - duration.start;
  const minRequiredTimeSpan = Math.max(MIN_TIME_SPAN_MS, minTimeSpanBasedOnBucketSpan);

  if (minRequiredTimeSpan > timeSpan) {
    messages.push({
      id: 'time_range_short',
      minTimeSpanReadable: MIN_TIME_SPAN_READABLE,
      bucketSpanCompareFactor: BUCKET_SPAN_COMPARE_FACTOR,
    });
  }

  if (messages.length === 0) {
    messages.push({ id: 'success_time_range' });
  }

  return messages;
}

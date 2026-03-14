/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  DURATION_REGEX,
  INTERVAL_FREQUENCY_REGEXP,
  DEFAULT_TIMEZONE,
} from '../../../../common/constants';
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const WEEKDAY_REGEX = '^(((\\+|-)[1-5])?(MO|TU|WE|TH|FR|SA|SU))$';

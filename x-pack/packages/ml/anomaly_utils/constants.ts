/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANOMALY_THRESHOLD } from './anomaly_threshold';
import { SEVERITY_COLORS } from './severity_colors';

/**
 * Severity color ramp.
 */
export const SEVERITY_COLOR_RAMP = [
  {
    stop: ANOMALY_THRESHOLD.LOW,
    color: SEVERITY_COLORS.WARNING,
  },
  {
    stop: ANOMALY_THRESHOLD.MINOR,
    color: SEVERITY_COLORS.MINOR,
  },
  {
    stop: ANOMALY_THRESHOLD.MAJOR,
    color: SEVERITY_COLORS.MAJOR,
  },
  {
    stop: ANOMALY_THRESHOLD.CRITICAL,
    color: SEVERITY_COLORS.CRITICAL,
  },
];

export const ANOMALY_RESULT_TYPE = {
  BUCKET: 'bucket',
  RECORD: 'record',
  INFLUENCER: 'influencer',
} as const;

/**
 * Array of partition fields.
 * @type {readonly ["partition_field", "over_field", "by_field"]}
 */
export const PARTITION_FIELDS = ['partition_field', 'over_field', 'by_field'] as const;

/**
 * Machine learning job id attribute name.
 * @type {"job_id"}
 */
export const JOB_ID = 'job_id';

/**
 * Machine learning partition field value attribute name.
 * @type {"partition_field_value"}
 */
export const PARTITION_FIELD_VALUE = 'partition_field_value';

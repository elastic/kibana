/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';
import { ML_SEVERITY_COLORS } from './severity_colors';

/**
 * Severity color ramp.
 */
export const ML_SEVERITY_COLOR_RAMP = [
  {
    stop: ML_ANOMALY_THRESHOLD.LOW,
    color: ML_SEVERITY_COLORS.WARNING,
  },
  {
    stop: ML_ANOMALY_THRESHOLD.MINOR,
    color: ML_SEVERITY_COLORS.MINOR,
  },
  {
    stop: ML_ANOMALY_THRESHOLD.MAJOR,
    color: ML_SEVERITY_COLORS.MAJOR,
  },
  {
    stop: ML_ANOMALY_THRESHOLD.CRITICAL,
    color: ML_SEVERITY_COLORS.CRITICAL,
  },
];

/**
 * Custom enum for anomaly result type
 */
export const ML_ANOMALY_RESULT_TYPE = {
  BUCKET: 'bucket',
  RECORD: 'record',
  INFLUENCER: 'influencer',
} as const;

/**
 * Array of partition fields.
 */
export const ML_PARTITION_FIELDS = ['partition_field', 'over_field', 'by_field'] as const;

/**
 * Machine learning job id attribute name.
 */
export const ML_JOB_ID = 'job_id';

/**
 * Machine learning partition field value attribute name.
 */
export const ML_PARTITION_FIELD_VALUE = 'partition_field_value';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Base record fields that are always available for filtering anomaly records,
 * regardless of job configuration.
 */
export const BASE_RECORD_FILTER_FIELDS = [
  'initial_record_score',
  'function',
  'field_name',
] as const;

/**
 * Influencer fields for anomaly records when jobs have influencers configured.
 */
export const RECORD_INFLUENCER_FIELDS = [
  'influencers.influencer_field_name',
  'influencers.influencer_field_values',
] as const;

/**
 * Influencer fields available for filtering anomaly influencers.
 */
export const INFLUENCER_FILTER_FIELDS = [
  'influencer_field_name',
  'influencer_field_value',
] as const;

/**
 * Detector field names used in anomaly records.
 */
export const DETECTOR_FILTER_FIELDS = {
  PARTITION_FIELD_NAME: 'partition_field_name',
  PARTITION_FIELD_VALUE: 'partition_field_value',
  BY_FIELD_NAME: 'by_field_name',
  BY_FIELD_VALUE: 'by_field_value',
  OVER_FIELD_NAME: 'over_field_name',
  OVER_FIELD_VALUE: 'over_field_value',
} as const;

/**
 * Actual/typical value fields for non-population jobs.
 */
export const TOP_LEVEL_ACTUAL_TYPICAL_FIELDS = ['actual', 'typical'] as const;

/**
 * Nested field for population jobs (actual/typical are nested under causes).
 */
export const NESTED_ACTUAL_TYPICAL_FIELDS = ['causes.actual', 'causes.typical'] as const;

export const DISALLOWED_FILTER_FIELDS = [
  'job_id',
  'is_interim',
  'record_score',
  'influencer_score',
] as const;

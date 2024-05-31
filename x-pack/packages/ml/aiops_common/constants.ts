/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AIOPS_PLUGIN_ID is used as a unique identifier for the aiops plugin
 */
export const AIOPS_PLUGIN_ID = 'aiops';

export const AIOPS_API_ENDPOINT = {
  LOG_RATE_ANALYSIS: '/internal/aiops/log_rate_analysis',
  CATEGORIZATION_FIELD_VALIDATION: '/internal/aiops/categorization_field_validation',
} as const;

export const AIOPS_TELEMETRY_ID = {
  AIOPS_DEFAULT_SOURCE: 'ml_aiops_labs',
  AIOPS_ANALYSIS_RUN_ORIGIN: 'aiops-analysis-run-origin',
} as const;

export const EMBEDDABLE_ORIGIN = 'embeddable';

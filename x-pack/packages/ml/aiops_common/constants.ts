/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * AIOPS_PLUGIN_ID is used as a unique identifier for the aiops plugin
 */
export const AIOPS_PLUGIN_ID = 'aiops';

export const AIOPS_API_ENDPOINT = {
  LOG_RATE_ANALYSIS_FIELD_CANDIDATES: '/internal/aiops/log_rate_analysis/field_candidates',
  LOG_RATE_ANALYSIS: '/internal/aiops/log_rate_analysis',
  CATEGORIZATION_FIELD_VALIDATION: '/internal/aiops/categorization_field_validation',
} as const;

/**
 * Used for telemetry purposes to track the origin of the analysis run.
 */
export const AIOPS_ANALYSIS_RUN_ORIGIN = 'aiops-analysis-run-origin';

export const AIOPS_EMBEDDABLE_ORIGIN = {
  CASES: 'cases',
  DASHBOARD: 'dashboard',
  DEFAULT: 'embeddable',
  DISCOVER: 'discover',
  ML_AIOPS_LABS: 'ml_aiops_labs',
} as const;

export const AIOPS_EMBEDDABLE_GROUPING = [
  {
    id: 'logs-aiops',
    getDisplayName: () =>
      i18n.translate('xpack.aiops.embedabble.groupingDisplayName', {
        defaultMessage: 'Logs AIOps',
      }),
    getIconType: () => 'machineLearningApp',
  },
];

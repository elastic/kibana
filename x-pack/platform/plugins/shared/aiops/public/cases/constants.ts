/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Titles for the cases toast messages
 */
export const TITLES = {
  CHANGE_POINT_DETECTION: i18n.translate('xpack.aiops.cases.changePointDetectionTitle', {
    defaultMessage: 'Change point chart',
  }),
  LOG_RATE_ANALYSIS: i18n.translate('xpack.aiops.cases.logRateAnalysisTitle', {
    defaultMessage: 'Log rate analysis',
  }),
  PATTERN_ANALYSIS: i18n.translate('xpack.aiops.cases.logPatternAnalysisTitle', {
    defaultMessage: 'Log pattern analysis',
  }),
};

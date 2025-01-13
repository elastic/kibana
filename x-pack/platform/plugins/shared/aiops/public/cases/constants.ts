/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import { i18n } from '@kbn/i18n';

/**
 * Titles for the cases toast messages
 */
export const CASES_TOAST_MESSAGES_TITLES = {
  CHANGE_POINT_DETECTION: (viewType: ChangePointDetectionViewType, chartsCount: number) =>
    viewType === 'table'
      ? i18n.translate('xpack.aiops.cases.changePointDetectionTableTitle', {
          defaultMessage: 'Change point table',
        })
      : i18n.translate('xpack.aiops.cases.changePointDetectionChartsTitle', {
          defaultMessage: 'Change point {chartsCount, plural, one {chart} other {charts}}',
          values: {
            chartsCount,
          },
        }),
  LOG_RATE_ANALYSIS: i18n.translate('xpack.aiops.cases.logRateAnalysisTitle', {
    defaultMessage: 'Log rate analysis',
  }),
  PATTERN_ANALYSIS: i18n.translate('xpack.aiops.cases.logPatternAnalysisTitle', {
    defaultMessage: 'Log pattern analysis',
  }),
};

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
export const CASES_TOAST_MESSAGES_TITLES = {
  ANOMALY_TIMELINE: i18n.translate('xpack.ml.cases.anomalyTimelineTitle', {
    defaultMessage: 'Anomaly timeline',
  }),
  ANOMALY_CHARTS: (chartsCount: number) =>
    i18n.translate('xpack.ml.cases.anomalyChartsTitle', {
      defaultMessage: 'Anomaly {chartsCount, plural, one {chart} other {charts}}',
      values: {
        chartsCount,
      },
    }),
  SINGLE_METRIC_VIEWER: i18n.translate('xpack.ml.cases.singleMetricViewerTitle', {
    defaultMessage: 'Single metric viewer',
  }),
};

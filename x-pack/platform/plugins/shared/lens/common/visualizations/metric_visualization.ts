/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IconChartMetric } from '@kbn/chart-icons';

export const LENS_METRIC_ID = 'lnsMetric';

export const metricLabel = i18n.translate('xpack.lens.metric.label', {
  defaultMessage: 'Metric',
});

export const visualizationTypes = [
  {
    id: LENS_METRIC_ID,
    icon: IconChartMetric,
    label: metricLabel,
    sortPriority: 4,
    description: i18n.translate('xpack.lens.metric.visualizationDescription', {
      defaultMessage: 'Present individual key metrics or KPIs.',
    }),
  },
];

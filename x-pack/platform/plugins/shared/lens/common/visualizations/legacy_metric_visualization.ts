/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IconChartMetric } from '@kbn/chart-icons';

export const visualizationTypes = [
  {
    id: 'lnsLegacyMetric',
    icon: IconChartMetric,
    label: i18n.translate('xpack.lens.legacyMetric.label', {
      defaultMessage: 'Legacy Metric',
    }),
    isDeprecated: true,
    sortPriority: 100,
    description: i18n.translate('xpack.lens.legacyMetric.visualizationDescription', {
      defaultMessage: 'Present individual key metrics or KPIs.',
    }),
  },
];

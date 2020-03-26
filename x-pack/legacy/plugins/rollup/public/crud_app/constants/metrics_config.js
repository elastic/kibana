/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const METRICS_CONFIG = [
  {
    type: 'avg',
    label: i18n.translate('xpack.rollupJobs.create.stepMetrics.checkboxAverageLabel', {
      defaultMessage: 'Average',
    }),
  },
  {
    type: 'max',
    label: i18n.translate('xpack.rollupJobs.create.stepMetrics.checkboxMaxLabel', {
      defaultMessage: 'Maximum',
    }),
  },
  {
    type: 'min',
    label: i18n.translate('xpack.rollupJobs.create.stepMetrics.checkboxMinLabel', {
      defaultMessage: 'Minimum',
    }),
  },
  {
    type: 'sum',
    label: i18n.translate('xpack.rollupJobs.create.stepMetrics.checkboxSumLabel', {
      defaultMessage: 'Sum',
    }),
  },
  {
    type: 'value_count',
    label: i18n.translate('xpack.rollupJobs.create.stepMetrics.checkboxValueCountLabel', {
      defaultMessage: 'Value count',
    }),
  },
];

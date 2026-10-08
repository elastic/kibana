/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const IMPACT_LABELS = Object.freeze({
  title: i18n.translate('xpack.alertzero.impact.title', {
    defaultMessage: 'Impact',
  }),
  showMore: (count: number) =>
    i18n.translate('xpack.alertzero.impact.showMore', {
      defaultMessage: '+{count}',
      values: { count },
    }),
  showMoreAriaLabel: (count: number) =>
    i18n.translate('xpack.alertzero.impact.showMoreAriaLabel', {
      defaultMessage: 'Show {count} more',
      values: { count },
    }),
  showFewer: i18n.translate('xpack.alertzero.impact.showFewer', {
    defaultMessage: 'Show fewer',
  }),
});

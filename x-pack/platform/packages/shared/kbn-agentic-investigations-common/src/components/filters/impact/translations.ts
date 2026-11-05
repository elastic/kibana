/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const IMPACT_LABELS = Object.freeze({
  title: i18n.translate('xpack.agenticInvestigations.impact.title', {
    defaultMessage: 'Impacted entities',
  }),
  showMore: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.impact.showMore', {
      defaultMessage: '+{count}',
      values: { count },
    }),
  showMoreAriaLabel: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.impact.showMoreAriaLabel', {
      defaultMessage: 'Show {count} more',
      values: { count },
    }),
  reachLimit: (limit: number, count: number) =>
    i18n.translate('xpack.agenticInvestigations.impact.reachLimit', {
      defaultMessage: 'Only the first {limit} entities can be listed; {count} more are not shown.',
      values: { limit, count },
    }),
  showFewer: i18n.translate('xpack.agenticInvestigations.impact.showFewer', {
    defaultMessage: 'Show fewer',
  }),
});

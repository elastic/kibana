/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACHMENTS_OVERVIEW_LABELS = Object.freeze({
  sectionTitle: i18n.translate('xpack.alertzero.attachmentsOverview.sectionTitle', {
    defaultMessage: 'Attachments',
  }),
  alerts: (count: number) =>
    i18n.translate('xpack.alertzero.attachmentsOverview.alerts', {
      defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
      values: { count },
    }),
  attacks: (count: number) =>
    i18n.translate('xpack.alertzero.attachmentsOverview.attacks', {
      defaultMessage: '{count, plural, one {# attack} other {# attacks}}',
      values: { count },
    }),
  entities: (count: number) =>
    i18n.translate('xpack.alertzero.attachmentsOverview.entities', {
      defaultMessage: '{count, plural, one {# entity} other {# entities}}',
      values: { count },
    }),
  rules: (count: number) =>
    i18n.translate('xpack.alertzero.attachmentsOverview.rules', {
      defaultMessage: '{count, plural, one {# rule} other {# rules}}',
      values: { count },
    }),
});

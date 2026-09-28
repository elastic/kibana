/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const IMPACT_LABELS = Object.freeze({
  groupTitle: i18n.translate('xpack.alertzero.detailsFlyout.impact.groupTitle', {
    defaultMessage: 'Impact',
  }),
  empty: i18n.translate('xpack.alertzero.detailsFlyout.impact.empty', {
    defaultMessage: 'Hosts and users this investigation hits will show up here.',
  }),
  openEntity: ({ label, type }: { label: string; type?: string }) =>
    type
      ? i18n.translate('xpack.alertzero.detailsFlyout.impact.openEntityWithType', {
          defaultMessage: 'Open {type} {label}',
          values: { type, label },
        })
      : i18n.translate('xpack.alertzero.detailsFlyout.impact.openEntity', {
          defaultMessage: 'Open {label}',
          values: { label },
        }),
});

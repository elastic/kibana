/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SHOWING = i18n.translate('xpack.siem.alertsViewer.showingLabel', {
  defaultMessage: 'Showing',
});

export const ALERTS = i18n.translate('xpack.siem.alertsViewer.eventsLabel', {
  defaultMessage: 'Alerts',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.alertsViewer.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

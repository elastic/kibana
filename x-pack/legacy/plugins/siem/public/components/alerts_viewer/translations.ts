/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_DOCUMENT_TYPE = i18n.translate('xpack.siem.hosts.alertsDocumentType', {
  defaultMessage: 'Alerts',
});

export const TOTAL_COUNT_OF_ALERTS = i18n.translate('xpack.siem.hosts.totalCountOfAlerts', {
  defaultMessage: 'alerts match the search criteria',
});

export const ALERTS_TABLE_TITLE = i18n.translate('xpack.siem.hosts.alertsDocumentType', {
  defaultMessage: 'Alerts',
});

export const ALERTS_STACK_BY_ACTIONS = i18n.translate(
  'xpack.siem.histogram.alertsStackByOptions.eventActions',
  {
    defaultMessage: 'actions',
  }
);

export const ALERTS_BY = i18n.translate('xpack.siem.histogram.alertsCountFrequencyByModuleTitle', {
  defaultMessage: 'by',
});

export const SHOWING = i18n.translate('xpack.siem.histogram.showing', {
  defaultMessage: 'Showing',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.histogram.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

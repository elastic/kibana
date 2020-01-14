/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_DOCUMENT_TYPE = i18n.translate('xpack.siem.alertsView.alertsDocumentType', {
  defaultMessage: 'Alerts',
});

export const TOTAL_COUNT_OF_ALERTS = i18n.translate('xpack.siem.alertsView.totalCountOfAlerts', {
  defaultMessage: 'alerts match the search criteria',
});

export const ALERTS_TABLE_TITLE = i18n.translate('xpack.siem.alertsView.alertsDocumentType', {
  defaultMessage: 'Alerts',
});

export const ALERTS_STACK_BY_MODULE = i18n.translate(
  'xpack.siem.alertsView.alertsStackByOptions.module',
  {
    defaultMessage: 'module',
  }
);

export const SHOWING = i18n.translate('xpack.siem.alertsView.showing', {
  defaultMessage: 'Showing',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.alertsView.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const ERROR_FETCHING_ALERTS_DATA = i18n.translate(
  'xpack.siem.alertsView.errorFetchingAlertsData',
  {
    defaultMessage: 'Failed to query alerts data',
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS = i18n.translate('xpack.siem.alertsTable.hostsTitle', {
  defaultMessage: 'Alerts',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.alertsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const NAME = i18n.translate('xpack.siem.alertsTable.nameTitle', {
  defaultMessage: 'Host name',
});

export const MODULE = i18n.translate('xpack.siem.alertsTable.moduleTitle', {
  defaultMessage: 'Module',
});

export const DATASET = i18n.translate('xpack.siem.alertsTable.datasetTitle', {
  defaultMessage: 'Dataset',
});

export const CATEGORY = i18n.translate('xpack.siem.alertsTable.categoryTitle', {
  defaultMessage: 'Category',
});

export const SERVERITY = i18n.translate('xpack.siem.alertsTable.serverityTitle', {
  defaultMessage: 'Serverity',
});

export const OBSERVER_NAME = i18n.translate('xpack.siem.alertsTable.observerNameTitle', {
  defaultMessage: 'Observer',
});

export const MESSAGE = i18n.translate('xpack.siem.alertsTable.messageTitle', {
  defaultMessage: 'Message',
});

export const ROWS_5 = i18n.translate('xpack.siem.alertsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.alertsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const HTTP_REQUESTS = i18n.translate('xpack.siem.networkHttpTable.title', {
  defaultMessage: 'HTTP Requests',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.networkHttpTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {request} other {requests}}`,
  });

export const METHOD = i18n.translate('xpack.siem.networkHttpTable.column.methodTitle', {
  defaultMessage: 'Method',
});
export const DOMAIN = i18n.translate('xpack.siem.networkHttpTable.column.domainTitle', {
  defaultMessage: 'Domain',
});

export const PATH = i18n.translate('xpack.siem.networkHttpTable.column.pathTitle', {
  defaultMessage: 'Path',
});

export const STATUS = i18n.translate('xpack.siem.networkHttpTable.column.statusTitle', {
  defaultMessage: 'Status',
});

export const LAST_HOST = i18n.translate('xpack.siem.networkHttpTable.column.lastHostTitle', {
  defaultMessage: 'Last host',
});

export const LAST_SOURCE_IP = i18n.translate(
  'xpack.siem.networkHttpTable.column.lastSourceIpTitle',
  {
    defaultMessage: 'Last source Ip',
  }
);

export const REQUESTS = i18n.translate('xpack.siem.networkHttpTable.column.requestsTitle', {
  defaultMessage: 'Requests',
});

export const ROWS_5 = i18n.translate('xpack.siem.networkHttpTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.networkHttpTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

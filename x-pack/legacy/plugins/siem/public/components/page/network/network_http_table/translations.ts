/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const INCOMING_HTTP_REQUESTS = i18n.translate('xpack.siem.networkHttpTable.title', {
  defaultMessage: 'Incoming HTTP Requests',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.networkHttpTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {request} other {requests}}`,
  });

export const METHOD = i18n.translate('xpack.siem.networkHttpTable.column.method', {
  defaultMessage: 'Method',
});
export const DOMAIN = i18n.translate('xpack.siem.networkHttpTable.column.domain', {
  defaultMessage: 'Domain',
});

export const PATH = i18n.translate('xpack.siem.networkHttpTable.column.path', {
  defaultMessage: 'Path',
});

export const STATUS = i18n.translate('xpack.siem.networkHttpTable.column.status', {
  defaultMessage: 'Status',
});

export const LAST_HOST = i18n.translate('xpack.siem.networkHttpTable.column.status', {
  defaultMessage: 'Last host',
});

export const LAST_SOURCE_IP = i18n.translate('xpack.siem.networkHttpTable.column.status', {
  defaultMessage: 'Last source Ip',
});

export const REQUESTS = i18n.translate('xpack.siem.networkHttpTable.column.status', {
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

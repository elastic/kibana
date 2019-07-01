/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const AUTHENTICATIONS = i18n.translate(
  'xpack.siem.authenticationsTable.authenticationFailures',
  {
    defaultMessage: 'Authentications',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.authenticationsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {User} other {Users}}`,
  });

export const LAST_SUCCESSFUL_SOURCE = i18n.translate(
  'xpack.siem.authenticationsTable.lastSuccessfulSource',
  {
    defaultMessage: 'Last Successful Source',
  }
);

export const LAST_SUCCESSFUL_DESTINATION = i18n.translate(
  'xpack.siem.authenticationsTable.lastSuccessfulDestination',
  {
    defaultMessage: 'Last Successful Destination',
  }
);

export const LAST_SUCCESSFUL_TIME = i18n.translate(
  'xpack.siem.authenticationsTable.lastSuccessfulTime',
  {
    defaultMessage: 'Last Success',
  }
);

export const LAST_FAILED_SOURCE = i18n.translate(
  'xpack.siem.authenticationsTable.lastFailedSource',
  {
    defaultMessage: 'Last Failed Source',
  }
);

export const LAST_FAILED_DESTINATION = i18n.translate(
  'xpack.siem.authenticationsTable.lastFailedDestination',
  {
    defaultMessage: 'Last Failed Destination',
  }
);

export const LAST_FAILED_TIME = i18n.translate('xpack.siem.authenticationsTable.lastFailedTime', {
  defaultMessage: 'Last Failure',
});

export const SUCCESSES = i18n.translate('xpack.siem.authenticationsTable.successes', {
  defaultMessage: 'Successes',
});

export const FAILURES = i18n.translate('xpack.siem.authenticationsTable.failures', {
  defaultMessage: 'Failures',
});

export const USER = i18n.translate('xpack.siem.authenticationsTable.user', {
  defaultMessage: 'User',
});

export const ROWS_5 = i18n.translate('xpack.siem.authenticationsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.authenticationsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.siem.authenticationsTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.siem.authenticationsTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

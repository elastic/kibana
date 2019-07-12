/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const USERS = i18n.translate('xpack.siem.network.ipDetails.usersTable.usersTitle', {
  defaultMessage: 'Users',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.network.ipDetails.usersTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {User} other {Users}}`,
  });

// Columns
export const USER_NAME = i18n.translate(
  'xpack.siem.network.ipDetails.usersTable.columns.userNameTitle',
  {
    defaultMessage: 'Name',
  }
);

export const USER_ID = i18n.translate(
  'xpack.siem.network.ipDetails.usersTable.columns.userIdTitle',
  {
    defaultMessage: 'ID',
  }
);

export const GROUP_NAME = i18n.translate(
  'xpack.siem.network.ipDetails.usersTable.columns.groupNameTitle',
  {
    defaultMessage: 'Group Name',
  }
);

export const GROUP_ID = i18n.translate(
  'xpack.siem.network.ipDetails.usersTable.columns.groupIdTitle',
  {
    defaultMessage: 'Group ID',
  }
);

export const DOCUMENT_COUNT = i18n.translate(
  'xpack.siem.network.ipDetails.usersTable.columns.documentCountTitle',
  {
    defaultMessage: 'Document Count',
  }
);

// Row Select
export const ROWS_5 = i18n.translate('xpack.siem.network.ipDetails.usersTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.network.ipDetails.usersTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.siem.network.ipDetails.usersTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.siem.network.ipDetails.usersTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const MORE = i18n.translate('xpack.siem.network.ipDetails.usersTable.moreDescription', {
  defaultMessage: 'More ...',
});

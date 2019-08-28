/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const UNCOMMON_PROCESSES = i18n.translate(
  'xpack.siem.authenticationsTable.uncommonProcessTable',
  {
    defaultMessage: 'Uncommon processes',
  }
);

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.uncommonProcessTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {process} other {processes}}`,
  });

export const HOSTS = i18n.translate('xpack.siem.uncommonProcessTable.hostsTitle', {
  defaultMessage: 'Hosts',
});

export const NUMBER_OF_HOSTS = i18n.translate(
  'xpack.siem.uncommonProcessTable.numberOfHostsTitle',
  {
    defaultMessage: 'Number of hosts',
  }
);

export const NUMBER_OF_INSTANCES = i18n.translate(
  'xpack.siem.uncommonProcessTable.numberOfInstances',
  {
    defaultMessage: 'Number of instances',
  }
);

export const LAST_COMMAND = i18n.translate('xpack.siem.uncommonProcessTable.lastCommandTitle', {
  defaultMessage: 'Last command',
});

export const LAST_USER = i18n.translate('xpack.siem.uncommonProcessTable.lastUserTitle', {
  defaultMessage: 'Last user',
});

export const NAME = i18n.translate('xpack.siem.uncommonProcessTable.nameTitle', {
  defaultMessage: 'Name',
});

export const ROWS_5 = i18n.translate('xpack.siem.uncommonProcessTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.uncommonProcessTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

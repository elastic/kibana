/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const DOMAINS = i18n.translate('xpack.siem.network.ipDetails.domainsTable.domainsTitle', {
  defaultMessage: 'Domains',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.network.ipDetails.domainsTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {domain} other {domains}}`,
  });

// Columns
export const DOMAIN_NAME = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.domainNameTitle',
  {
    defaultMessage: 'Domain name',
  }
);

export const DIRECTION = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.directionTitle',
  {
    defaultMessage: 'Direction',
  }
);

export const BYTES = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.bytesTitle',
  {
    defaultMessage: 'Bytes',
  }
);

export const PACKETS = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.packetsTitle',
  {
    defaultMessage: 'Packets',
  }
);

export const UNIQUE_DESTINATIONS = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.uniqueDestinationsTitle',
  {
    defaultMessage: 'Unique destinations',
  }
);

export const UNIQUE_SOURCES = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.uniqueSourcesTitle',
  {
    defaultMessage: 'Unique sources',
  }
);

export const UNIQUE_CLIENTS = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.uniqueClientsTitle',
  {
    defaultMessage: 'Unique servers',
  }
);

export const UNIQUE_SERVERS = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.uniqueServersTitle',
  {
    defaultMessage: 'Unique clients',
  }
);

export const LAST_SEEN = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.lastSeenTitle',
  {
    defaultMessage: 'Last seen',
  }
);

export const FIRST_LAST_SEEN_TOOLTIP = i18n.translate(
  'xpack.siem.network.ipDetails.domainsTable.columns.firstLastSeenToolTip',
  {
    defaultMessage: 'Relative to the selected date range',
  }
);

// Row Select
export const ROWS_5 = i18n.translate('xpack.siem.network.ipDetails.domainsTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.network.ipDetails.domainsTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

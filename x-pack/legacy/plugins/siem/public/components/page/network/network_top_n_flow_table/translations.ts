/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TOP_TALKERS = i18n.translate('xpack.siem.networkTopNFlowTable.title', {
  defaultMessage: 'Top talkers',
});

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.networkTopNFlowTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {IP} other {IPs}}`,
  });

export const SOURCE_IP = i18n.translate('xpack.siem.networkTopNFlowTable.column.sourceIpTitle', {
  defaultMessage: 'Source IP',
});

export const DESTINATION_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.column.destinationIpTitle',
  {
    defaultMessage: 'Destination IP',
  }
);

export const CLIENT_IP = i18n.translate('xpack.siem.networkTopNFlowTable.column.clientIpTitle', {
  defaultMessage: 'Client IP',
});

export const SERVER_IP = i18n.translate('xpack.siem.networkTopNFlowTable.column.serverIpTitle', {
  defaultMessage: 'Server IP',
});

export const DOMAIN = i18n.translate('xpack.siem.networkTopNFlowTable.column.lastDomainTitle', {
  defaultMessage: 'Last domain',
});

export const BYTES = i18n.translate('xpack.siem.networkTopNFlowTable.column.bytesTitle', {
  defaultMessage: 'Bytes',
});

export const PACKETS = i18n.translate('xpack.siem.networkTopNFlowTable.column.packetsTitle', {
  defaultMessage: 'Packets',
});

export const DIRECTION = i18n.translate('xpack.siem.networkTopNFlowTable.column.directionTitle', {
  defaultMessage: 'Direction',
});

export const UNIQUE_SOURCE_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.column.uniqueSourceIpsTitle',
  {
    defaultMessage: 'Unique source IPs',
  }
);

export const UNIQUE_DESTINATION_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.column.uniqueDestinationIpsTitle',
  {
    defaultMessage: 'Unique destination IPs',
  }
);

export const UNIQUE_CLIENT_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.column.uniqueClientIpsTitle',
  {
    defaultMessage: 'Unique client IPs',
  }
);

export const UNIQUE_SERVER_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.column.uniqueServerIpsTitle',
  {
    defaultMessage: 'Unique server IPs',
  }
);

export const BY_SOURCE_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.select.bySourceIpDropDownOptionLabel',
  {
    defaultMessage: 'By source IP',
  }
);

export const BY_DESTINATION_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.select.byDestinationIpDropDownOptionLabel',
  {
    defaultMessage: 'By destination IP',
  }
);

export const BY_CLIENT_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.select.byClientIpDropDownOptionLabel',
  {
    defaultMessage: 'By client IP',
  }
);

export const BY_SERVER_IP = i18n.translate(
  'xpack.siem.networkTopNFlowTable.select.byServerIpDropDownOptionLabel',
  {
    defaultMessage: 'By server IP',
  }
);

export const ROWS_5 = i18n.translate('xpack.siem.networkTopNFlowTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.networkTopNFlowTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

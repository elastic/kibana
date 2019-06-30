/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const BYTES = i18n.translate('xpack.siem.kpiIpDetails.source.bytesTitle', {
  defaultMessage: 'Bytes',
});

export const IN = i18n.translate('xpack.siem.kpiIpDetails.source.inTitle', {
  defaultMessage: 'In',
});

export const OUT = i18n.translate('xpack.siem.kpiIpDetails.source.outTitle', {
  defaultMessage: 'Out',
});

export const SOURCE_IP = i18n.translate('xpack.siem.kpiIpDetails.source.sourceIpTitle', {
  defaultMessage: 'Source',
});

export const DESTINATION_IP = i18n.translate('xpack.siem.kpiIpDetails.source.destinationIpTitle', {
  defaultMessage: 'Dist.',
});

export const TOP_SOURCE_IP = i18n.translate('xpack.siem.kpiIpDetails.source.topSourceIpTitle', {
  defaultMessage: 'Top Source IP',
});

export const TOP_TRANSPORT_IP = i18n.translate('xpack.siem.kpiIpDetails.source.topSourceIpTitle', {
  defaultMessage: 'Top transport IP',
});

export const TOP_DESTINATION_IP = i18n.translate(
  'xpack.siem.kpiIpDetails.source.topDestinationIpTitle',
  {
    defaultMessage: 'Top Dist. IP',
  }
);

export const TOP_DESTINATION_PORT = i18n.translate(
  'xpack.siem.kpiIpDetails.source.topDestinationPortTitle',
  {
    defaultMessage: 'Top Dist. Port',
  }
);

export const TOP_TRANSPORT = i18n.translate('xpack.siem.kpiIpDetails.source.topTransportTitle', {
  defaultMessage: 'Top Transport',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_FETCHING_AUTHENTICATIONS_DATA = i18n.translate(
  'xpack.siem.component.matrixHistogram.errorFetchingAuthenticationsData',
  {
    defaultMessage: 'Failed to query authentications data',
  }
);

export const ERROR_FETCHING_ANOMALIES_DATA = i18n.translate(
  'xpack.siem.component.matrixHistogram.errorFetchingAnomaliesData',
  {
    defaultMessage: 'Failed to query anomalies data',
  }
);

export const ERROR_FETCHING_EVENTS_DATA = i18n.translate(
  'xpack.siem.component.matrixHistogram.errorFetchingEventsData',
  {
    defaultMessage: 'Failed to query events data',
  }
);

export const ERROR_FETCHING_ALERTS_DATA = i18n.translate(
  'xpack.siem.component.matrixHistogram.errorFetchingAlertsData',
  {
    defaultMessage: 'Failed to query alerts data',
  }
);

export const ERROR_FETCHING_DNS_DATA = i18n.translate(
  'xpack.siem.component.matrixHistogram.errorFetchingDnsData',
  {
    defaultMessage: 'Failed to query DNS data',
  }
);

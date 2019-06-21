/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const AUTHENTICATION_SUCCESS = i18n.translate(
  'xpack.siem.kpiHostDetails.source.authenticationSuccessTitle',
  {
    defaultMessage: 'Success',
  }
);

export const AUTHENTICATION_FAILURE = i18n.translate(
  'xpack.siem.kpiHostDetails.source.authenticationFailureTitle',
  {
    defaultMessage: 'Fail',
  }
);

export const AUTHENTICATION = i18n.translate(
  'xpack.siem.kpiHostDetails.source.authenticationTitle',
  {
    defaultMessage: 'User Authentications',
  }
);

export const ACTIVE_USERS = i18n.translate('xpack.siem.kpiHostDetails.source.activeUsersTitle', {
  defaultMessage: 'Active Users',
});

export const UNIQUE_IPS = i18n.translate('xpack.siem.kpiHostDetails.source.uniqueIpsTitle', {
  defaultMessage: 'Unique IPs',
});

export const UNIQUE_SOURCE_IPS = i18n.translate(
  'xpack.siem.kpiHostDetails.source.uniqueSourceIpsTitle',
  {
    defaultMessage: 'Source',
  }
);

export const UNIQUE_SOURCE_IPS_ABBREVIATION = i18n.translate(
  'xpack.siem.kpiHostDetails.source.uniqueSourceIpsAbbreviationTitle',
  {
    defaultMessage: 'Src.',
  }
);

export const UNIQUE_DESTINATION_IPS = i18n.translate(
  'xpack.siem.kpiHostDetails.source.uniqueDestinationIpsTitle',
  {
    defaultMessage: 'Destination',
  }
);

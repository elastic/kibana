/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const HOSTS = i18n.translate('xpack.siem.kpiHosts.source.hostsTitle', {
  defaultMessage: 'Hosts',
});

export const AGENTS = i18n.translate('xpack.siem.kpiHosts.source.agentsTitle', {
  defaultMessage: 'Agents',
});

export const AUTHENTICATION_SUCCESS = i18n.translate(
  'xpack.siem.kpiHosts.source.authenticationSuccessTitle',
  {
    defaultMessage: 'Success',
  }
);

export const AUTHENTICATION_FAILURE = i18n.translate(
  'xpack.siem.kpiHosts.source.authenticationFailureTitle',
  {
    defaultMessage: 'Fail',
  }
);

export const AUTHENTICATION = i18n.translate('xpack.siem.kpiHosts.source.authenticationTitle', {
  defaultMessage: 'User Authentications',
});

export const ACTIVE_USERS = i18n.translate('xpack.siem.kpiHosts.source.activeUsersTitle', {
  defaultMessage: 'Active Users',
});

export const UNIQUE_IPS = i18n.translate('xpack.siem.kpiHosts.source.uniqueIpsTitle', {
  defaultMessage: 'Unique IPs',
});

export const UNIQUE_SOURCE_IPS = i18n.translate('xpack.siem.kpiHosts.source.uniqueSourceIpsTitle', {
  defaultMessage: 'Source',
});

export const UNIQUE_SOURCE_IPS_ABBREVIATION = i18n.translate(
  'xpack.siem.kpiHosts.source.uniqueSourceIpsAbbreviationTitle',
  {
    defaultMessage: 'Src.',
  }
);

export const UNIQUE_DESTINATION_IPS = i18n.translate(
  'xpack.siem.kpiHosts.source.uniqueDestinationIpsTitle',
  {
    defaultMessage: 'Destination',
  }
);

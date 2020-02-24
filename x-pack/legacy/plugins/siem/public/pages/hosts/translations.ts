/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const KQL_PLACEHOLDER = i18n.translate('xpack.siem.hosts.kqlPlaceholder', {
  defaultMessage: 'e.g. host.name: "foo"',
});

export const PAGE_TITLE = i18n.translate('xpack.siem.hosts.pageTitle', {
  defaultMessage: 'Hosts',
});

export const NAVIGATION_ALL_HOSTS_TITLE = i18n.translate(
  'xpack.siem.hosts.navigation.allHostsTitle',
  {
    defaultMessage: 'All hosts',
  }
);

export const NAVIGATION_AUTHENTICATIONS_TITLE = i18n.translate(
  'xpack.siem.hosts.navigation.authenticationsTitle',
  {
    defaultMessage: 'Authentications',
  }
);

export const NAVIGATION_UNCOMMON_PROCESSES_TITLE = i18n.translate(
  'xpack.siem.hosts.navigation.uncommonProcessesTitle',
  {
    defaultMessage: 'Uncommon processes',
  }
);

export const NAVIGATION_ANOMALIES_TITLE = i18n.translate(
  'xpack.siem.hosts.navigation.anomaliesTitle',
  {
    defaultMessage: 'Anomalies',
  }
);

export const NAVIGATION_EVENTS_TITLE = i18n.translate('xpack.siem.hosts.navigation.eventsTitle', {
  defaultMessage: 'Events',
});

export const NAVIGATION_ALERTS_TITLE = i18n.translate('xpack.siem.hosts.navigation.alertsTitle', {
  defaultMessage: 'External alerts',
});

export const ERROR_FETCHING_AUTHENTICATIONS_DATA = i18n.translate(
  'xpack.siem.hosts.navigaton.matrixHistogram.errorFetchingAuthenticationsData',
  {
    defaultMessage: 'Failed to query authentications data',
  }
);

export const ERROR_FETCHING_EVENTS_DATA = i18n.translate(
  'xpack.siem.hosts.navigaton.matrixHistogram.errorFetchingEventsData',
  {
    defaultMessage: 'Failed to query events data',
  }
);

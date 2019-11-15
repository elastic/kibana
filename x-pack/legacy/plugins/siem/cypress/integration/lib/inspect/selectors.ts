/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOSTS_PAGE, HOSTS_PAGE_TAB_URLS, NETWORK_PAGE, NETWORK_TAB_URLS } from '../urls';

export const INSPECT_BUTTON_ICON = '[data-test-subj="inspect-icon-button"]';
export const INSPECT_MODAL = '[data-test-subj="modal-inspect-euiModal"]';
export const TIMELINE_SETTINGS_ICON = '[data-test-subj="settings-gear"]';
export const TIMELINE_INSPECT_BUTTON = '[data-test-subj="inspect-empty-button"]';

interface InspectButtonMetadata {
  altInspectId?: string;
  id: string;
  title: string;
  url: string;
}

export const INSPECT_BUTTONS_IN_SIEM: InspectButtonMetadata[] = [
  {
    id: '[data-test-subj="stat-hosts"]',
    title: 'Hosts Stat',
    url: HOSTS_PAGE,
  },
  {
    id: '[data-test-subj="stat-authentication"]',
    title: 'User Authentications Stat',
    url: HOSTS_PAGE,
  },
  {
    id: '[data-test-subj="stat-uniqueIps"]',
    title: 'Unique IPs Stat',
    url: HOSTS_PAGE,
  },
  {
    id: '[data-test-subj="stat-networkEvents"]',
    title: 'Network events Stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="stat-dnsQueries"]',
    title: 'DNS queries Stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="stat-uniqueFlowId"]',
    title: 'Unique flow IDs Stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="stat-tlsHandshakes"]',
    title: 'TLS handshakes Stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="stat-UniqueIps"]',
    title: 'Unique private IPs Stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="table-topNFlowSource-loading-false"]',
    title: 'Source IPs Table',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="table-topNFlowDestination-loading-false"]',
    title: 'Destination IPs Table',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="table-dns-loading-false"]',
    title: 'Top DNS Domains Table',
    url: NETWORK_TAB_URLS.dns,
  },
  {
    id: '[data-test-subj="table-allHosts-loading-false"]',
    title: 'All Hosts Table',
    url: HOSTS_PAGE_TAB_URLS.allHosts,
  },
  {
    id: '[data-test-subj="table-authentications-loading-false"]',
    title: 'Authentications Table',
    url: HOSTS_PAGE_TAB_URLS.authentications,
  },
  {
    id: '[data-test-subj="table-uncommonProcesses-loading-false"]',
    title: 'Uncommon processes Table',
    url: HOSTS_PAGE_TAB_URLS.uncommonProcesses,
  },
  {
    altInspectId: `[data-test-subj="events-viewer-panel"] ${INSPECT_BUTTON_ICON}`,
    id: '[data-test-subj="events-container-loading-false"]',
    title: 'Events Table',
    url: HOSTS_PAGE_TAB_URLS.events,
  },
];

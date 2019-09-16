/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOSTS_PAGE, HOSTS_PAGE_TAB_URLS, NETWORK_PAGE } from '../urls';

export const INSPECT_BUTTON_ICON = '[data-test-subj="inspect-icon-button"]';
export const INSPECT_MODAL = '[data-test-subj="modal-inspect-euiModal"]';
export const TIMELINE_SETTINGS_ICON = '[data-test-subj="settings-gear"]';
export const TIMELINE_INSPECT_BUTTON = '[data-test-subj="inspect-empty-button"]';

export const INSPECT_BUTTONS_IN_SIEM = [
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
    type: 'stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="stat-dnsQueries"]',
    title: 'DNS queries Stat',
    type: 'stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="stat-uniqueFlowId"]',
    title: 'Unique flow IDs Stat',
    type: 'stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="stat-tlsHandshakes"]',
    title: 'TLS handshakes Stat',
    type: 'stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="stat-UniqueIps"]',
    title: 'Unique private IPs Stat',
    type: 'stat',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="table-topNFlowSource-false"]',
    title: 'Source IPs Table',
    type: 'table',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="table-topNFlowDestination-false"]',
    title: 'Destination IPs Table',
    type: 'table',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="table-dns-false"]',
    title: 'Top DNS Domains Table',
    type: 'table',
    url: NETWORK_PAGE,
  },
  {
    id: '[data-test-subj="table-allHosts-false"]',
    title: 'All Hosts Table',
    type: 'table',
    url: HOSTS_PAGE_TAB_URLS.allHosts,
  },
  {
    id: '[data-test-subj="table-authentications-false"]',
    title: 'Authentications Table',
    type: 'table',
    url: HOSTS_PAGE_TAB_URLS.authentications,
  },
  {
    id: '[data-test-subj="table-uncommonProcesses-false"]',
    title: 'Uncommon processes Table',
    type: 'table',
    url: HOSTS_PAGE_TAB_URLS.uncommonProcesses,
  },
  {
    id: '[data-test-subj="events-container-false"]',
    altInspectId: `[data-test-subj="events-viewer-header"] ${INSPECT_BUTTON_ICON}`,
    title: 'Events Table',
    type: 'table',
    url: HOSTS_PAGE_TAB_URLS.events,
  },
];

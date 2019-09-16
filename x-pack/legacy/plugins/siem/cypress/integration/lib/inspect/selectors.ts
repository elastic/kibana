/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const INSPECT_BUTTON_ICON = '[data-test-subj="inspect-icon-button"]';
export const INSPECT_MODAL = '[data-test-subj="modal-inspect-euiModal"]';
export const HOST_TABLE_WRAPPER = '[data-test-subj="host-table-wrapper"]';
export const TIMELINE_SETTINGS_ICON = '[data-test-subj="settings-gear"]';
export const TIMELINE_INSPECT_BUTTON = '[data-test-subj="inspect-empty-button"]';
export const HOST_STATS = [
  {
    id: '[data-test-subj="stat-hosts"]',
    title: 'Hosts',
  },
  {
    id: '[data-test-subj="stat-authentications"]',
    title: 'User Authentications',
  },
  {
    id: '[data-test-subj="stat-uniqueIps"]',
    title: 'Unique IPs',
  },
];

export const NETWORK_INSPECT_TABLES = [
  {
    id: '[data-test-subj="stat-networkEvents"]',
    title: 'Network events',
    type: 'stat',
  },
  {
    id: '[data-test-subj="stat-dnsQueries"]',
    title: 'DNS queries',
    type: 'stat',
  },
  {
    id: '[data-test-subj="stat-uniqueFlowId"]',
    title: 'Unique flow IDs',
    type: 'stat',
  },
  {
    id: '[data-test-subj="stat-tlsHandshakes"]',
    title: 'TLS handshakes',
    type: 'stat',
  },
  {
    id: '[data-test-subj="stat-UniqueIps"]',
    title: 'Unique private IPs',
    type: 'stat',
  },
  {
    id: '[data-test-subj="table-topNFlowSource"]',
    title: 'Source IPs',
    type: 'table',
  },
  {
    id: '[data-test-subj="table-topNFlowDestination"]',
    title: 'Destination IPs',
    type: 'table',
  },
  {
    id: '[data-test-subj="table-dns"]',
    title: 'Top DNS Domains',
    type: 'table',
  },
];

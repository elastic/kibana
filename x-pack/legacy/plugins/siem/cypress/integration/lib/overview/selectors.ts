/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Host Stats
export const STAT_AUDITD = {
  value: '123',
  domId: '[data-test-subj="host-stat-auditbeatAuditd"]',
};
export const STAT_FILEBEAT = {
  value: '890',
  domId: '[data-test-subj="host-stat-filebeatSystemModule"]',
};
export const STAT_FIM = {
  value: '345',
  domId: '[data-test-subj="host-stat-auditbeatFIM"]',
};
export const STAT_LOGIN = {
  value: '456',
  domId: '[data-test-subj="host-stat-auditbeatLogin"]',
};
export const STAT_PACKAGE = {
  value: '567',
  domId: '[data-test-subj="host-stat-auditbeatPackage"]',
};
export const STAT_PROCESS = {
  value: '678',
  domId: '[data-test-subj="host-stat-auditbeatProcess"]',
};
export const STAT_USER = {
  value: '789',
  domId: '[data-test-subj="host-stat-auditbeatUser"]',
};
export const STAT_WINLOGBEAT = {
  value: '100',
  domId: '[data-test-subj="host-stat-winlogbeat"]',
};

export const HOST_STATS = [
  STAT_AUDITD,
  STAT_FILEBEAT,
  STAT_FIM,
  STAT_LOGIN,
  STAT_PACKAGE,
  STAT_PROCESS,
  STAT_USER,
  STAT_WINLOGBEAT,
];

// Network Stats
export const STAT_SOCKET = {
  value: '578,502',
  domId: '[data-test-subj="network-stat-auditbeatSocket"]',
};
export const STAT_CISCO = {
  value: '999',
  domId: '[data-test-subj="network-stat-filebeatCisco"]',
};
export const STAT_NETFLOW = {
  value: '2,544',
  domId: '[data-test-subj="network-stat-filebeatNetflow"]',
};
export const STAT_PANW = {
  value: '678',
  domId: '[data-test-subj="network-stat-filebeatPanw"]',
};
export const STAT_SURICATA = {
  value: '303,699',
  domId: '[data-test-subj="network-stat-filebeatSuricata"]',
};
export const STAT_ZEEK = {
  value: '71,129',
  domId: '[data-test-subj="network-stat-filebeatZeek"]',
};
export const STAT_DNS = {
  value: '1,090',
  domId: '[data-test-subj="network-stat-packetbeatDNS"]',
};
export const STAT_FLOW = {
  value: '722,153',
  domId: '[data-test-subj="network-stat-packetbeatFlow"]',
};
export const STAT_TLS = {
  value: '340',
  domId: '[data-test-subj="network-stat-packetbeatTLS"]',
};

export const NETWORK_STATS = [
  STAT_SOCKET,
  STAT_CISCO,
  STAT_NETFLOW,
  STAT_PANW,
  STAT_SURICATA,
  STAT_ZEEK,
  STAT_DNS,
  STAT_FLOW,
  STAT_TLS,
];

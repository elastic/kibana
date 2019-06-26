/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestBasicOptions } from '../framework/types';

export const mockOptionsNetwork: RequestBasicOptions = {
  defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  sourceConfiguration: {
    fields: {
      container: 'docker.container.name',
      host: 'beat.hostname',
      message: ['message', '@message'],
      pod: 'kubernetes.pod.name',
      tiebreaker: '_doc',
      timestamp: '@timestamp',
    },
  },
  timerange: { interval: '12h', to: 1549852006071, from: 1549765606071 },
  filterQuery: {},
};

export const mockRequestNetwork = {
  params: {},
  payload: {
    operationName: 'GetOverviewNetworkQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1549765830772, to: 1549852230772 },
      filterQuery: '',
    },
    query:
      'query GetOverviewNetworkQuery(\n    $sourceId: ID!\n    $timerange: TimerangeInput!\n    $filterQuery: String\n  ) {\n    source(id: $sourceId) {\n      id\n      OverviewNetwork(timerange: $timerange, filterQuery: $filterQuery) {\n        packetbeatFlow\n        packetbeatDNS\n        filebeatSuricata\n        filebeatZeek\n        auditbeatSocket\n      }\n    }\n  }',
  },
  query: {},
};

export const mockResponseNetwork = {
  took: 89,
  timed_out: false,
  _shards: { total: 18, successful: 18, skipped: 0, failed: 0 },
  hits: { total: { value: 950867, relation: 'eq' }, max_score: null, hits: [] },
  aggregations: {
    unique_flow_count: { doc_count: 50243 },
    unique_dns_count: { doc_count: 15000 },
    unique_suricata_count: { doc_count: 2375 },
    unique_zeek_count: { doc_count: 456 },
    unique_socket_count: { doc_count: 13 },
    unique_filebeat_count: {
      doc_count: 456756,
      unique_cisco_count: { doc_count: 14 },
      unique_netflow_count: { doc_count: 992 },
      unique_panw_count: { doc_count: 225 },
    },
    unique_packetbeat_count: { doc_count: 7897896, unique_tls_count: { doc_count: 2009 } },
  },
};

export const mockResultNetwork = {
  packetbeatFlow: 50243,
  packetbeatDNS: 15000,
  filebeatSuricata: 2375,
  filebeatZeek: 456,
  auditbeatSocket: 13,
  filebeatCisco: 14,
  filebeatNetflow: 992,
  filebeatPanw: 225,
  packetbeatTLS: 2009,
};

export const mockOptionsHost: RequestBasicOptions = {
  defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  sourceConfiguration: {
    fields: {
      container: 'docker.container.name',
      host: 'beat.hostname',
      message: ['message', '@message'],
      pod: 'kubernetes.pod.name',
      tiebreaker: '_doc',
      timestamp: '@timestamp',
    },
  },
  timerange: { interval: '12h', to: 1549852006071, from: 1549765606071 },
  filterQuery: {},
};

export const mockRequestHost = {
  params: {},
  payload: {
    operationName: 'GetOverviewHostQuery',
    variables: {
      sourceId: 'default',
      timerange: { interval: '12h', from: 1549765830772, to: 1549852230772 },
      filterQuery: '',
    },
    query:
      'query GetOverviewHostQuery(\n    $sourceId: ID!\n    $timerange: TimerangeInput!\n    $filterQuery: String\n  ) {\n    source(id: $sourceId) {\n      id\n      OverviewHost(timerange: $timerange, filterQuery: $filterQuery) {\n        auditbeatAuditd\n        auditbeatFIM\n        auditbeatLogin\n        auditbeatPackage\n        auditbeatProcess\n        auditbeatUser\n      }\n    }\n  }',
  },
  query: {},
};

export const mockResponseHost = {
  took: 89,
  timed_out: false,
  _shards: { total: 18, successful: 18, skipped: 0, failed: 0 },
  hits: { total: { value: 950867, relation: 'eq' }, max_score: null, hits: [] },
  aggregations: {
    auditd_count: { doc_count: 73847 },
    fim_count: { doc_count: 107307 },
    system_module: {
      doc_count: 20000000,
      login_count: { doc_count: 60015 },
      package_count: { doc_count: 2003 },
      process_count: { doc_count: 1200 },
      user_count: { doc_count: 1979 },
      filebeat_count: { doc_count: 225 },
    },
    winlog_count: { doc_count: 737 },
  },
};

export const mockResultHost = {
  auditbeatAuditd: 73847,
  auditbeatFIM: 107307,
  auditbeatLogin: 60015,
  auditbeatPackage: 2003,
  auditbeatProcess: 1200,
  auditbeatUser: 1979,
  filebeatSystemModule: 225,
  winlogbeat: 737,
};

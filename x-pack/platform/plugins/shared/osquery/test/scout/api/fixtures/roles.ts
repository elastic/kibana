/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout role definitions for osquery RBAC tests.
 *
 * These match the serverless Security Solution role definitions from
 * cypress/lib/kibana_roles/project_controller_security_roles.yml,
 * transformed to the KibanaRole format used by Scout's `getApiKeyForCustomRole()`.
 *
 * If the YAML source changes, update these definitions accordingly.
 */

import type { KibanaRole } from '@kbn/scout';

const SECURITY_ALERT_INDICES = ['.alerts-security*', '.siem-signals-*'];

const COMMON_READ_INDICES = [
  '.lists*',
  '.items*',
  'apm-*-transaction*',
  'traces-apm*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
  'metrics-endpoint.metadata_current_*',
  '.fleet-agents*',
  '.fleet-actions*',
  'risk-score.risk-score-*',
  '.entities.v1.latest.security_*',
  '.ml-anomalies-*',
  'security_solution-*.misconfiguration_latest*',
  '.entity_analytics.monitoring*',
];

const COMMON_KIBANA_FEATURES = {
  ml: ['read'],
  siemV5: ['read', 'endpoint_list_read'],
  securitySolutionRulesV2: ['read'],
  securitySolutionAssistant: ['all'],
  securitySolutionAttackDiscovery: ['all'],
  securitySolutionTimeline: ['read'],
  securitySolutionNotes: ['read'],
  actions: ['read'],
  builtInAlerts: ['read'],
  osquery: ['read', 'run_saved_queries'],
  discover: ['all'],
  dashboard: ['all'],
  canvas: ['all'],
  graph: ['all'],
  maps: ['all'],
  visualize: ['all'],
  savedQueryManagement: ['all'],
};

export const T1_ANALYST_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      { names: SECURITY_ALERT_INDICES, privileges: ['read', 'write', 'maintenance'] },
      {
        names: [...COMMON_READ_INDICES, '.asset-criticality.asset-criticality-*'],
        privileges: ['read'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      spaces: ['*'],
      feature: {
        ...COMMON_KIBANA_FEATURES,
        securitySolutionCases: ['read'],
      },
    },
  ],
};

export const T2_ANALYST_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      { names: SECURITY_ALERT_INDICES, privileges: ['read', 'write', 'maintenance'] },
      { names: COMMON_READ_INDICES, privileges: ['read'] },
      { names: ['.asset-criticality.asset-criticality-*'], privileges: ['read', 'write'] },
    ],
  },
  kibana: [
    {
      base: [],
      spaces: ['*'],
      feature: {
        ...COMMON_KIBANA_FEATURES,
        securitySolutionCases: ['all'],
      },
    },
  ],
};

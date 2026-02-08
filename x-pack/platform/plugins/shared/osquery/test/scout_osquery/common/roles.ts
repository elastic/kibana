/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// ── SOC Manager ───────────────────────────────────────────────────────────────

/**
 * SOC Manager role — mirrors the Cypress `soc_manager` role.
 *
 * This is a non-admin role with broad Security Solution + Osquery
 * permissions, representative of the access a SOC manager would have.
 */
export const socManagerRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [
      {
        names: [
          'apm-*-transaction*',
          'traces-apm*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
          'metrics-*',
          'metricbeat-*',
          '.asset-criticality.asset-criticality-*',
          '.entities.v1.latest.security_*',
          'security_solution-*.misconfiguration_latest*',
        ],
        privileges: ['read', 'write'],
      },
      {
        names: [
          '.alerts-security*',
          '.siem-signals-*',
          '.preview.alerts-security*',
          '.internal.preview.alerts-security*',
          '.adhoc.alerts-security*',
          '.internal.adhoc.alerts-security*',
        ],
        privileges: ['read', 'write', 'manage'],
      },
      {
        names: ['.lists*', '.items*', '.lists-default*', '.items-default*'],
        privileges: ['read', 'write', 'manage', 'view_index_metadata'],
      },
      {
        names: [
          'metrics-endpoint.metadata_current_*',
          '.fleet-agents*',
          '.fleet-actions*',
          'risk-score.risk-score-*',
          '.ml-anomalies-*',
          '.entity_analytics.monitoring*',
        ],
        privileges: ['read'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        ml: ['read'],
        generalCases: ['all'],
        siem: [
          'all',
          'policy_management_all',
          'endpoint_list_all',
          'global_artifact_management_all',
          'trusted_applications_all',
          'trusted_devices_all',
          'event_filters_all',
          'host_isolation_exceptions_all',
          'blocklist_all',
          'endpoint_exceptions_all',
          'host_isolation_all',
          'process_operations_all',
          'actions_log_management_all',
          'file_operations_all',
          'execute_operations_all',
          'scan_operations_all',
          'workflow_insights_all',
        ],
        securitySolutionRules: ['all'],
        securitySolutionCases: ['all'],
        observabilityCases: ['all'],
        securitySolutionAssistant: ['all'],
        securitySolutionAttackDiscovery: ['all'],
        securitySolutionTimeline: ['all'],
        securitySolutionNotes: ['all'],
        actions: ['all'],
        builtInAlerts: ['all'],
        osquery: ['all'],
        fleet: ['all'],
        fleetv2: ['all'],
        infrastructure: ['all'],
        indexPatterns: ['all'],
        discover: ['all'],
        dashboard: ['all'],
        canvas: ['all'],
        graph: ['all'],
        maps: ['all'],
        visualize: ['all'],
        savedQueryManagement: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

// ── T1 Analyst ────────────────────────────────────────────────────────────────

/**
 * Tier 1 Analyst — limited permissions, can run saved queries but not create new ones.
 */
export const t1AnalystRole: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: [
          'apm-*-transaction*',
          'traces-apm*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
        privileges: ['read'],
      },
      {
        names: ['.alerts-security*', '.siem-signals-*'],
        privileges: ['read', 'write'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        siem: ['all'],
        securitySolutionCases: ['all'],
        securitySolutionTimeline: ['all'],
        actions: ['read'],
        builtInAlerts: ['all'],
        osquery: ['read', 'run_saved_queries'],
        discover: ['all'],
        dashboard: ['all'],
        savedQueryManagement: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

// ── T2 Analyst ────────────────────────────────────────────────────────────────

/**
 * Tier 2 Analyst — similar to T1 but with case management.
 */
export const t2AnalystRole: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: [
          'apm-*-transaction*',
          'traces-apm*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
        privileges: ['read'],
      },
      {
        names: ['.alerts-security*', '.siem-signals-*'],
        privileges: ['read', 'write', 'manage'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        siem: ['all'],
        securitySolutionCases: ['all'],
        securitySolutionTimeline: ['all'],
        actions: ['read'],
        builtInAlerts: ['all'],
        osquery: ['read', 'run_saved_queries'],
        generalCases: ['all'],
        discover: ['all'],
        dashboard: ['all'],
        savedQueryManagement: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

// ── Reader ────────────────────────────────────────────────────────────────────

/**
 * Reader role — read-only access to Osquery. Cannot run queries.
 */
export const readerRole: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['logs-*', 'filebeat-*', 'auditbeat-*'],
        privileges: ['read'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        siem: ['read'],
        securitySolutionCases: ['read'],
        osquery: ['read'],
        discover: ['read'],
        dashboard: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

// ── Platform Engineer ─────────────────────────────────────────────────────────

/**
 * Platform Engineer role — Fleet/integration management access.
 */
export const platformEngineerRole: KibanaRole = {
  elasticsearch: {
    cluster: ['manage'],
    indices: [
      {
        names: ['logs-*', 'metrics-*', '.fleet-*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        fleet: ['all'],
        fleetv2: ['all'],
        osquery: ['all'],
        discover: ['all'],
        dashboard: ['all'],
        indexPatterns: ['all'],
        savedQueryManagement: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

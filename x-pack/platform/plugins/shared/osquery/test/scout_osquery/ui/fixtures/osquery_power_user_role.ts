/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Least-privileged role that covers every feature surface exercised by the osquery
 * Scout UI specs under `parallel_tests/`. Applied via
 * `browserAuth.loginWithCustomRole(osqueryPowerUserRole)` behind the
 * `loginAsOsqueryPowerUser()` fixture extension. Replaces `loginAsAdmin()`.
 *
 * Coverage mapping (see `openspec/changes/osquery-scout-ui-hardening/phase-hardening-verification.md`
 * §1.1.2):
 *  - feature_osquery.all              — every spec
 *  - feature_fleet / fleetv2.all      — fleet_integration, custom_space (policy share + create)
 *  - feature_siemV5.all               — alert-path specs (rule editor, alerts view, Timeline)
 *  - feature_securitySolutionRulesV2  — legacy rules feature id (kept for parity)
 *  - feature_securitySolutionRulesV4  — detection-rule CRUD in UI (`RULES_FEATURE_LATEST`; required
 *                                        on serverless where capabilities resolve to V4 only)
 *  - feature_securitySolutionTimeline — alert flyout → Timeline specs
 *  - feature_securitySolutionCases    — osquery_case_security + alert_case_creation
 *  - feature_observabilityCases       — osquery_case_observability (stateful-only)
 *  - feature_discover_v2.all          — Discover link assertions in live_query_submission_with_agent + custom_space
 *  - feature_visualize_v2.all         — Lens popup in packs_crud
 *  - feature_savedQueryManagement.all — saved_queries_crud
 *  - feature_actions / builtInAlerts  — detection-rule + response-action internals
 *  - feature_infrastructure.all       — inventory_osquery_tab (Infra/Metrics host detail page
 *                                       at /app/metrics/detail/host/...; feature id resolves
 *                                       via `METRICS_FEATURE_ID = 'infrastructure'` in
 *                                       x-pack/solutions/observability/plugins/infra/common/constants.ts)
 */
export const osqueryPowerUserRole: KibanaRole = {
  elasticsearch: {
    cluster: ['manage'],
    indices: [
      {
        names: [
          '.alerts-security*',
          '.siem-signals-*',
          '.preview.alerts-security*',
          '.internal.preview.alerts-security*',
          '.adhoc.alerts-security*',
          '.internal.adhoc.alerts-security*',
          '.lists*',
          '.items*',
          '.fleet-agents*',
          '.fleet-actions*',
          'logs-osquery_manager.*',
          'logs-*',
          'metrics-*',
          'metricbeat-*',
          'metrics-endpoint.metadata_current_*',
        ],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        osquery: ['all'],
        fleet: ['all'],
        fleetv2: ['all'],
        siemV5: ['all'],
        securitySolutionRulesV2: ['all'],
        securitySolutionRulesV4: ['all'],
        securitySolutionTimeline: ['all'],
        securitySolutionCases: ['all'],
        securitySolutionNotes: ['all'],
        securitySolutionAssistant: ['all'],
        securitySolutionAttackDiscovery: ['all'],
        observabilityCases: ['all'],
        actions: ['all'],
        builtInAlerts: ['all'],
        discover_v2: ['all'],
        dashboard_v2: ['all'],
        visualize_v2: ['all'],
        maps_v2: ['all'],
        savedQueryManagement: ['all'],
        indexPatterns: ['all'],
        infrastructure: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardDatasetExample } from '../../../src/types';
import { discoverResultsExample } from './factories';

/**
 * Dashboards built from Discover ES|QL results that parse the sample logs with
 * `DISSECT` (elastic/kibana#294133). The derived columns look like fields but
 * are not mapped, so a control on one of them renders "Unknown column".
 */
export const DASHBOARD_DISCOVER_RESULTS_EXAMPLES: DashboardDatasetExample[] = [
  discoverResultsExample({
    question:
      'Build a web traffic dashboard from these results with KPI metrics, trends and breakdowns.',
    controls: { requested: false },
    structure: { panelCount: { min: 6 } },
  }),
  discoverResultsExample({
    question:
      'Build a web traffic dashboard from these results with KPI metrics, trends, breakdowns, and controls for HTTP method, status code, path and HTTP version.',
    // All four exist only as DISSECT output; status code and path have mapped
    // stand-ins, HTTP method and HTTP version have none.
    controls: {
      requested: true,
      requestedFilters: [
        { name: 'HTTP method', terms: ['method'], substitutes: [] },
        { name: 'status code', terms: ['status'], substitutes: ['response'] },
        { name: 'path', terms: ['path'], substitutes: ['request', 'url'] },
        { name: 'HTTP version', terms: ['version'], substitutes: [] },
      ],
    },
    structure: { panelCount: { min: 6 } },
  }),
  discoverResultsExample({
    question:
      'Build a web traffic dashboard from these results with 4 KPI metrics and a breakdown by status code, plus a control to filter by machine OS.',
    controls: { requested: true, mustInclude: ['machine.os'] },
    structure: { panelKinds: { metric: 4 } },
  }),
];

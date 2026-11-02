/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardDatasetExample } from '../../../src/types';
import { dashboardExample } from './factories';

/**
 * Dashboard creation over `kibana_sample_data_logs`. Layout rules and
 * composition order apply to every produced dashboard; `structure` adds only
 * what each prompt pins down.
 */
export const DASHBOARD_CREATION_EXAMPLES: DashboardDatasetExample[] = [
  dashboardExample({
    question: 'Create a dashboard showing my sample log data. Decide on visualizations and layout.',
    structure: { panelCount: { min: 10, max: 20 } },
  }),
  dashboardExample({
    question:
      "Create a dashboard using kibana_sample_data_logs with 2 sections: 'Traffic Volume' with a panel showing requests over time, and 'Response Codes' with a panel showing response.keyword distribution.",
    structure: {
      sectionCount: 2,
      sections: [
        { titleIncludesAny: ['traffic', 'trend', 'time'] },
        { titleIncludesAny: ['response', 'status', 'code'] },
      ],
    },
  }),
  dashboardExample({
    question:
      'Create a dashboard using kibana_sample_data_logs with 6 compact metric panels in one row: total requests, error count, average bytes, unique hosts, 95th percentile bytes, and max memory.',
    structure: { panelKinds: { metric: 6 } },
  }),
  dashboardExample({
    question:
      'Create a dashboard using kibana_sample_data_logs with 4 KPI metric panels across the top row and one full-width time series panel directly below them.',
    structure: { panelKinds: { metric: 4, xy: 1 } },
  }),
];

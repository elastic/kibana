/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { LOGS_VISUALIZATIONS } from '../../../src/fixtures/logs_visualizations';
import { SECTIONED_LOGS_DASHBOARD_DSL_VEGA } from '../../../src/fixtures/sectioned_logs_dashboard';
import { TOP_LEVEL, type DashboardDatasetExample } from '../../../src/types';
import { layoutEditExample } from './factories';

const editScenario = (gold: Parameters<typeof layoutEditExample>[0]): DashboardDatasetExample =>
  layoutEditExample({ ...gold, behaviour: 'edit_scenario' });

/**
 * Edits of the seeded sectioned logs dashboard beyond moving ES|QL panels:
 * the non-ES|QL panel kinds, controls, data the cluster does not have,
 * visualizations from earlier in the conversation, and section renames.
 * Each example combines several asks, so one run covers more than one gap.
 */
export const DASHBOARD_EDIT_SCENARIO_EXAMPLES: DashboardDatasetExample[] = [
  editScenario({
    question:
      'make the bars of the Vega chart blue and raise the severity threshold of the anomaly swim lane to 75',
    layoutEdit: { changes: [] },
    panelEdits: [
      { panel: 'requests-by-os-vega', type: 'vega', color: 'blue' },
      { panel: 'request-rate-anomalies', config: { severity_threshold: 75 } },
    ],
  }),
  editScenario({
    question: 'rename the requests by file extension chart to "File types"',
    replaceConfirmation: { panel: 'requests-by-extension' },
  }),
  editScenario({
    question: 'make the bars of the Vega chart blue',
    dashboard: SECTIONED_LOGS_DASHBOARD_DSL_VEGA,
    replaceConfirmation: { panel: 'requests-by-os-vega' },
  }),
  editScenario({
    question:
      'replace the operating system filter with a destination country filter, and remove the bytes slider',
    layoutEdit: { changes: [] },
    controls: {
      requested: true,
      mustInclude: ['geo.dest'],
      mustExclude: ['machine.os.keyword', 'bytes'],
      timeSlider: true,
    },
  }),
  editScenario({
    question:
      'add a Payments section with revenue charts from the payments-* index, and a metric of average bytes per request next to the KPIs at the top',
    layoutEdit: {
      changes: [TOP_LEVEL],
      placements: [{ item: { added: 'metric' }, in: TOP_LEVEL, beside: 'kpi-requests' }],
    },
    structure: { sectionCount: 4 },
    unavailableRequests: [{ name: 'payments' }],
  }),
  editScenario({
    question: 'add the two charts we made to the dashboard, in a new Key charts section at the end',
    visualizations: LOGS_VISUALIZATIONS,
    layoutEdit: {
      changes: [TOP_LEVEL],
      placements: [{ item: { added: 'section' }, after: 'other-sources' }],
    },
    structure: {
      sections: [
        {
          titleIncludesAny: ['key chart'],
          queries: compact(LOGS_VISUALIZATIONS.map(({ data }) => data.esql)),
        },
      ],
    },
  }),
  editScenario({
    question: 'add a range slider for machine RAM and remove the time slider',
    layoutEdit: { changes: [] },
    controls: {
      requested: true,
      mustInclude: ['machine.ram', 'machine.os.keyword', 'bytes'],
      rangeSliders: ['machine.ram'],
      timeSlider: false,
    },
  }),
  editScenario({
    question:
      'rename the Visitors section to "Audience" and move the top referrers table out of it to the top level, below the KPIs',
    layoutEdit: {
      changes: ['visitors', TOP_LEVEL],
      placements: [{ item: 'top-referrers', in: TOP_LEVEL, below: 'kpi-requests' }],
    },
    structure: { sectionCount: 4, sections: [{ titleIncludesAny: ['audience'], minPanels: 2 }] },
  }),
  editScenario({
    question:
      'move the Vega chart to the top level below the KPIs, delete the anomaly swim lane, and change the bytes slider to machine RAM',
    layoutEdit: {
      changes: [TOP_LEVEL, 'other-sources'],
      removed: ['request-rate-anomalies'],
      placements: [{ item: 'requests-by-os-vega', in: TOP_LEVEL, below: 'kpi-requests' }],
    },
    controls: {
      requested: true,
      mustInclude: ['machine.ram', 'machine.os.keyword'],
      mustExclude: ['bytes'],
      rangeSliders: ['machine.ram'],
      timeSlider: true,
    },
  }),
  editScenario({
    question:
      'in the Other sources section, add a note that anomaly scores above 75 are critical, a swim lane of the response_code_rates anomaly job viewed by influencer, and a Vega heatmap of requests by hour of day and day of week',
    layoutEdit: {
      changes: ['other-sources'],
      placements: [
        { item: { added: 'markdown' }, in: 'other-sources' },
        { item: { added: 'ml_anomaly_swimlane' }, in: 'other-sources' },
        { item: { added: 'vega' }, in: 'other-sources' },
      ],
    },
    // The seeded low_request_rate job has no influencers; response_code_rates does.
    panelEdits: [
      { panel: { added: 'markdown' }, contentIncludes: ['75', 'critical'] },
      {
        panel: { added: 'ml_anomaly_swimlane' },
        config: { job_ids: ['response_code_rates'], swimlane_type: 'viewBy' },
      },
      { panel: { added: 'vega' }, vegaMark: 'rect' },
    ],
    structure: { panelKinds: { markdown: 3, ml_anomaly_swimlane: 2, vega: 2 } },
  }),
  editScenario({
    question:
      'delete the Errors section but keep its errors by host table at the top level below the KPIs, and make the 4xx errors chart red and move it into Traffic',
    layoutEdit: {
      changes: [TOP_LEVEL, 'traffic'],
      removed: ['errors', 'error-rate', 'errors-5xx', 'errors-by-url'],
      placements: [
        { item: 'errors-by-host', in: TOP_LEVEL, below: 'kpi-requests' },
        { item: 'errors-4xx', in: 'traffic' },
      ],
    },
    panelEdits: [{ panel: 'errors-4xx', color: 'red' }],
    structure: { sectionCount: 3 },
  }),
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSection } from '@kbn/agent-builder-dashboards-common';
import {
  SECTIONED_LOGS_DASHBOARD,
  SECTIONED_LOGS_DASHBOARD_VISITORS_COLLAPSED,
} from '../../../src/fixtures/sectioned_logs_dashboard';
import { TOP_LEVEL, type DashboardDatasetExample } from '../../../src/types';
import { layoutEditExample } from './factories';

const getSectionPanelIds = (sectionId: string): string[] =>
  SECTIONED_LOGS_DASHBOARD.panels
    .filter(isSection)
    .filter(({ id }) => id === sectionId)
    .flatMap(({ panels }) => panels.map(({ id }) => id));

const TRAFFIC_PANELS = getSectionPanelIds('traffic');
const VISITORS_PANELS = getSectionPanelIds('visitors');

/**
 * Edits of a sectioned logs dashboard that add, remove, move or restyle
 * panels and sections. Each one may rearrange only the containers it touches;
 * the rest keep their grids, and the outer order of the surviving top-level
 * panels and sections holds.
 */
export const DASHBOARD_LAYOUT_EDIT_EXAMPLES: DashboardDatasetExample[] = [
  layoutEditExample({
    question: 'remove the requests over time chart from the Traffic section',
    layoutEdit: { changes: ['traffic'], removed: ['requests-over-time'] },
  }),
  layoutEditExample({
    question: 'remove the top URLs table from the Traffic section',
    layoutEdit: { changes: ['traffic'], removed: ['top-urls'] },
  }),
  layoutEditExample({
    question: 'remove the error rate metric from the Errors section and the bytes over time chart',
    layoutEdit: { changes: ['errors', 'traffic'], removed: ['error-rate', 'bytes-over-time'] },
  }),
  layoutEditExample({
    question: 'remove the Visitors section and its panels',
    layoutEdit: { changes: [], removed: ['visitors', ...VISITORS_PANELS] },
  }),
  layoutEditExample({
    question: 'add a metric of average bytes per request to the KPIs at the top',
    layoutEdit: {
      changes: [TOP_LEVEL],
      placements: [{ item: { added: 'metric' }, in: TOP_LEVEL, beside: 'kpi-requests' }],
    },
  }),
  layoutEditExample({
    question:
      'add a line chart of average bytes over time to the Traffic section, right after the requests over time chart',
    layoutEdit: {
      changes: ['traffic'],
      placements: [
        {
          item: { added: 'xy' },
          in: 'traffic',
          after: 'requests-over-time',
          before: 'requests-by-os',
        },
      ],
    },
  }),
  layoutEditExample({
    question: 'add a Key metrics section with total requests, bytes and error rate',
    layoutEdit: {
      changes: [TOP_LEVEL],
      placements: [{ item: { added: 'section' }, before: 'traffic' }],
    },
  }),
  layoutEditExample({
    question: 'add a section about response sizes between Traffic and Errors',
    layoutEdit: {
      changes: [TOP_LEVEL],
      placements: [{ item: { added: 'section' }, after: 'traffic', before: 'errors' }],
    },
  }),
  layoutEditExample({
    question:
      'move the errors by host table out of the Errors section to the top level, below the KPIs',
    layoutEdit: {
      changes: ['errors', TOP_LEVEL],
      placements: [{ item: 'errors-by-host', in: TOP_LEVEL, below: 'kpi-requests', w: 48 }],
    },
  }),
  layoutEditExample({
    question: 'move the top URLs table from the Traffic section into the Errors section',
    layoutEdit: {
      changes: ['traffic', 'errors'],
      placements: [{ item: 'top-urls', in: 'errors' }],
    },
  }),
  layoutEditExample({
    question: 'move the markdown note into the Visitors section, at the top',
    layoutEdit: {
      changes: ['visitors', TOP_LEVEL],
      placements: [{ item: 'note', in: 'visitors', first: true }],
    },
  }),
  layoutEditExample({
    question: 'make the requests over time chart red and rename it to "Requests"',
    layoutEdit: { changes: [] },
  }),
  layoutEditExample({
    question:
      'turn the response codes pie into a data table, and expand the intro markdown with a bullet list of what each section shows',
    layoutEdit: { changes: ['traffic', TOP_LEVEL] },
  }),
  layoutEditExample({
    question:
      'make the errors by host table full width and put the 5xx chart next to the 4xx chart',
    layoutEdit: {
      changes: ['errors'],
      placements: [
        { item: 'errors-by-host', w: 48 },
        { item: 'errors-5xx', beside: 'errors-4xx' },
      ],
    },
  }),
  layoutEditExample({
    question: 'make every panel in the Traffic section half width',
    layoutEdit: {
      changes: ['traffic'],
      placements: TRAFFIC_PANELS.map((item) => ({ item, w: 24 })),
    },
  }),
  layoutEditExample({
    question: 'add a metric of average bytes per visitor to the Visitors section',
    dashboard: SECTIONED_LOGS_DASHBOARD_VISITORS_COLLAPSED,
    layoutEdit: {
      changes: ['visitors'],
      placements: [{ item: { added: 'metric' }, in: 'visitors' }],
    },
  }),
  layoutEditExample({
    question: 'remove all panels from the Visitors section but keep the section',
    layoutEdit: { changes: ['visitors'], removed: VISITORS_PANELS },
  }),
];

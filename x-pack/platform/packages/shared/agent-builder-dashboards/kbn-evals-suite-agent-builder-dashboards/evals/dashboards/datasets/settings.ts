/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECTIONED_LOGS_DASHBOARD } from '../../../src/fixtures/sectioned_logs_dashboard';
import type { DashboardDatasetExample } from '../../../src/types';
import { layoutEditExample } from './factories';

const settingsEdit = ({
  question,
  settings,
}: Pick<
  Parameters<typeof layoutEditExample>[0],
  'question' | 'settings'
>): DashboardDatasetExample =>
  layoutEditExample({
    question,
    settings,
    timeRange: SECTIONED_LOGS_DASHBOARD.time_range,
    layoutEdit: { changes: [] },
    behaviour: 'settings_edit',
  });

/**
 * Changes to the dashboard settings of the seeded sectioned logs dashboard. The seed stores a
 * time range, so auto-refresh is kept. Each example may change only the settings it names: the
 * other settings and the time range keep their seed values (so "every 30 seconds" read as a time
 * window fails), and no panel moves. The first sets three options in one call; the last changes
 * no setting.
 */
export const DASHBOARD_SETTINGS_EXAMPLES: DashboardDatasetExample[] = [
  settingsEdit({
    question: 'hide the panel titles and borders and sync the tooltips',
    settings: {
      options: { hide_panel_titles: true, hide_panel_borders: true, sync_tooltips: true },
    },
  }),
  settingsEdit({
    question: 'refresh the dashboard every 30 seconds',
    settings: { refreshInterval: { pause: false, value: 30000 } },
  }),
  settingsEdit({
    question: 'make the dashboard faster with approximate results',
    settings: { esqlApproximation: true },
  }),
  settingsEdit({
    question: 'rename the dashboard to "Web traffic overview"',
    settings: {},
  }),
];

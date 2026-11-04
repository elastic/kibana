/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import logsDashboard from './sample_logs_dashboard.json';

const [mapWarning, sankeyWarning, markdownWarning, heatmapWarning] = logsDashboard.warnings;

/**
 * The `[Logs] Web Traffic` sample dashboard as `GET /api/dashboards/{id}` returns it, captured by
 * the Isomer corpus (`@kbn/isomer-corpus`) from Kibana 9.7.0.
 */
export const logsDashboardRead = logsDashboard;

/**
 * The panels the Dashboard API drops from that dashboard, as the Dashboard app's read keeps them:
 * positions from the sample's saved object (the home plugin's `data_sets/logs/saved_objects.ts`),
 * configs from the API's `dropped_panel` warnings, which carry the same transformed configs.
 */
export const logsDroppedAppPanels = [
  { id: '4', type: 'map', grid: { x: 0, y: 14, w: 24, h: 18 }, config: mapWarning.panel_config },
  {
    id: '14',
    type: 'legacy_vis',
    grid: { x: 24, y: 14, w: 24, h: 33 },
    config: sankeyWarning.panel_config,
  },
  {
    id: '343f0bef-0b19-452e-b1c8-59beb18b6f0c',
    type: 'legacy_vis',
    grid: { x: 0, y: 0, w: 24, h: 7 },
    config: markdownWarning.panel_config,
  },
  {
    id: '8e59c7cf-6e42-4343-a113-c4a255fcf2ce',
    type: 'legacy_vis',
    grid: { x: 0, y: 32, w: 24, h: 15 },
    config: heatmapWarning.panel_config,
  },
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

/**
 * Default values for all dashboard state fields except project_routing and refresh_interval.
 * A missing refresh_interval keeps the dashboard's own, because the timefilter clamps any
 * default below its minimum refresh interval and would report it as an unsaved change.
 */
export const EMPTY_DASHBOARD_STATE = Object.freeze({
  title: '',
  description: '',
  panels: [],
  query: { expression: '', language: 'kql' as const },
  filters: [],
  options: {
    hide_panel_titles: false,
    hide_panel_borders: false,
    use_margins: true,
    auto_apply_filters: true,
    sync_colors: false,
    sync_cursor: true,
    sync_tooltips: false,
  },
  pinned_panels: [],
  tags: [],
  access_control: {},
});

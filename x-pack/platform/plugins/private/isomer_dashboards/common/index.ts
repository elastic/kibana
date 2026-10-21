/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_BASE = '/internal/isomer_dashboards';
/** The mobile view is a page a browser opens, so it's an HTTP resource rather than an internal API. */
export const VIEW_BASE = '/isomer_dashboards';

/** The page widths a dashboard draws at, in CSS pixels: Kibana's grid, and a phone. */
export const PAGE_WIDTH = { grid: 1400, stack: 420, min: 320, max: 2400 } as const;

export type DashboardLayout = 'grid' | 'stack';

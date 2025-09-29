/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trackUiCounterEvents } from '../lens_ui_telemetry';

const events = {
  rawColorMappings: 'raw_color_mappings',
  legendStats: 'legend_stats',
  metric: 'metric_refactor',
};

type ChartTypes = 'xy' | 'tagcloud' | 'partition' | 'metric' | 'datatable';

/**
 * Track runtime migration events
 *
 * @param event
 * @param chartType - optional event qualifier
 */
export function trackRuntimeMigration(event: 'metric'): void;
export function trackRuntimeMigration(
  event: 'legendStats',
  chartType?: Extract<ChartTypes, 'xy' | 'partition'>
): void;
export function trackRuntimeMigration(
  event: 'rawColorMappings',
  chartType?: Extract<ChartTypes, 'xy' | 'tagcloud' | 'partition' | 'datatable'>
): void;
export function trackRuntimeMigration(event: keyof typeof events, chartType?: ChartTypes): void {
  trackUiCounterEvents(`runtime_migrations_${events[event]}${chartType ? `_${chartType}` : ''}`);
}

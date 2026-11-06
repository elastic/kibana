/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lightweight entry for plugin `setup()` — registers EBT event types without pulling
 * React UI into the page-load bundle. Prefer lazy-loading this subpath:
 *
 * `void import('@kbn/change-history-ui/telemetry').then(...)`
 */
export { registerChangeHistoryTelemetryEvents } from './src/telemetry/register_change_history_telemetry_events';

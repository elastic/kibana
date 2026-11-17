/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { SystemEventsWriter, buildRunDoc, truncateErrorMessage } from './system_events_writer';
export {
  installSystemEventsStreams,
  uninstallSystemEventsStreams,
  ensureSystemEventsStreamsOnce,
} from './ensure_system_events_streams';
export { summarizeExtractionRuns } from './summarize_runs';
export { SYSTEM_EVENT_ACTION, SYSTEM_EVENT_REASON } from './types';
export type { RunEventInput, SystemEventDoc, SystemEventTrigger } from './types';
export { toExtractionRunEvent } from './extraction_run_event';
export { createSystemEventsDashboardClient } from './dashboard/install_dashboard';
export type { SystemEventsDashboardClient } from './dashboard/install_dashboard';

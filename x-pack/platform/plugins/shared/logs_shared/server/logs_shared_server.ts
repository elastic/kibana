/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsSharedBackendLibs } from './lib/logs_shared_types';

import { initLogViewRoutes } from './routes/log_views';
import { initMigrateLogViewSettingsRoute } from './routes/deprecations';

export const initLogsSharedServer = (libs: LogsSharedBackendLibs) => {
  initLogViewRoutes(libs);
  initMigrateLogViewSettingsRoute(libs);
};

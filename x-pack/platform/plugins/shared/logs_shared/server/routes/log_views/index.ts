/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogsSharedBackendLibs } from '../../lib/logs_shared_types';
import { initGetLogViewRoute } from './get_log_view';
import { initPutLogViewRoute } from './put_log_view';

export const initLogViewRoutes = (libs: LogsSharedBackendLibs) => {
  initGetLogViewRoute(libs);

  // Register the log view update endpoint only when the Saved object is correctly registered
  if (!libs.isServerless) {
    initPutLogViewRoute(libs);
  }
};

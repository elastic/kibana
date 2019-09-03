/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { registerOptInRoutes } from './opt_in';
import { registerTelemetryDataRoutes } from './telemetry_stats';

export function registerRoutes(core: CoreSetup) {
  registerOptInRoutes(core);
  registerTelemetryDataRoutes(core);
}

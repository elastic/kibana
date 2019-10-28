/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { CoreSetup, SavedObjectsLegacyService } from 'src/core/server';
import { existingFieldsRoute } from './existing_fields';
import { initFieldsRoute } from './field_stats';
import { initLensUsageRoute } from './telemetry';

export function setupRoutes(
  setup: CoreSetup,
  plugins: {
    savedObjects: SavedObjectsLegacyService;
    config: KibanaConfig;
  }
) {
  existingFieldsRoute(setup);
  initFieldsRoute(setup);
  initLensUsageRoute(setup, plugins);
}

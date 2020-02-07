/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { FleetServerLib } from '../libs/types';
import { HapiFrameworkAdapter } from '../adapters/framework/hapi_framework_adapter';
import { createGETArtifactsRoute } from './artifacts';
import { createGETInstallScript } from './install';
import { createGETAgentsStatusRoute } from './agents/status';

export function initRestApi(server: Server, libs: FleetServerLib) {
  const frameworkAdapter = new HapiFrameworkAdapter(server);

  createAgentsRoutes(frameworkAdapter, libs);
  frameworkAdapter.registerRoute(createGETArtifactsRoute(libs));
  frameworkAdapter.registerRoute(createGETInstallScript(libs));
}

function createAgentsRoutes(adapter: HapiFrameworkAdapter, libs: FleetServerLib) {
  adapter.registerRoute(createGETAgentsStatusRoute(libs));
}

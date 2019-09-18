/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { createListAgentsRoute } from './agents/list';
import { createDeleteAgentsRoute } from './agents/delete';
import { createEnrollAgentsRoute } from './agents/enroll';
import { createCheckinAgentsRoute } from './agents/checkin';
import { createGetEnrollmentTokenRoute } from './tokens/get_enrollment';
import { FleetServerLib } from '../libs/types';
import { HapiFrameworkAdapter } from '../libs/adapters/framework/hapi_framework_adapter';
import { createAgentsAddActionRoute } from './agents/add_action';

export function initRestApi(server: Server, libs: FleetServerLib) {
  const frameworkAdapter = new HapiFrameworkAdapter(server);

  createAgentsRoutes(frameworkAdapter, libs);
  createTokensRoutes(frameworkAdapter, libs);
}

function createAgentsRoutes(adapter: HapiFrameworkAdapter, libs: FleetServerLib) {
  adapter.registerRoute(createListAgentsRoute(libs));
  adapter.registerRoute(createDeleteAgentsRoute(libs));
  adapter.registerRoute(createEnrollAgentsRoute(libs));
  adapter.registerRoute(createCheckinAgentsRoute(libs));
  adapter.registerRoute(createAgentsAddActionRoute(libs));
}

function createTokensRoutes(adapter: HapiFrameworkAdapter, libs: FleetServerLib) {
  adapter.registerRoute(createGetEnrollmentTokenRoute(libs));
}

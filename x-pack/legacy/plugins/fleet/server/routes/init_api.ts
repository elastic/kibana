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
import { createGetEnrollmentTokenRoute } from './policy/tokens';
import { FleetServerLib } from '../libs/types';
import { HapiFrameworkAdapter } from '../adapters/framework/hapi_framework_adapter';
import { createAgentsAddActionRoute } from './agents/actions';
import {
  createDeleteEnrollmentRuleRoute,
  createGetEnrollmentRulesRoute,
  createPostEnrollmentRulesRoute,
} from './policy/rules';
import { createGETArtifactsRoute } from './artifacts';
import { createGETAgentEventsRoute } from './agents/events';
import { createGETInstallScript } from './install';

export function initRestApi(server: Server, libs: FleetServerLib) {
  const frameworkAdapter = new HapiFrameworkAdapter(server);

  createAgentsRoutes(frameworkAdapter, libs);
  createTokensRoutes(frameworkAdapter, libs);
  createPolicyEnrollmentRoutes(frameworkAdapter, libs);

  frameworkAdapter.registerRoute(createGETArtifactsRoute(libs));
  frameworkAdapter.registerRoute(createGETInstallScript(libs));
}

function createAgentsRoutes(adapter: HapiFrameworkAdapter, libs: FleetServerLib) {
  adapter.registerRoute(createListAgentsRoute(libs));
  adapter.registerRoute(createDeleteAgentsRoute(libs));
  adapter.registerRoute(createEnrollAgentsRoute(libs));
  adapter.registerRoute(createCheckinAgentsRoute(libs));
  adapter.registerRoute(createAgentsAddActionRoute(libs));
  adapter.registerRoute(createGETAgentEventsRoute(libs));
}

function createTokensRoutes(adapter: HapiFrameworkAdapter, libs: FleetServerLib) {
  adapter.registerRoute(createGetEnrollmentTokenRoute(libs));
}

function createPolicyEnrollmentRoutes(adapter: HapiFrameworkAdapter, libs: FleetServerLib) {
  adapter.registerRoute(createDeleteEnrollmentRuleRoute(libs));
  adapter.registerRoute(createGetEnrollmentRulesRoute(libs));
  adapter.registerRoute(createPostEnrollmentRulesRoute(libs));
}

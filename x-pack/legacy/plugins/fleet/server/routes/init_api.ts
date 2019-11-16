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
import { FleetServerLib } from '../libs/types';
import { HapiFrameworkAdapter } from '../adapters/framework/hapi_framework_adapter';
import { createAgentsAddActionRoute } from './agents/actions';
import {
  createDeleteEnrollmentRuleRoute,
  createGetEnrollmentRulesRoute,
  createPostEnrollmentRulesRoute,
} from './enrollment_api_keys/rules';
import { createGETArtifactsRoute } from './artifacts';
import { createGETAgentEventsRoute } from './agents/events';
import { createGETInstallScript } from './install';
import { createGETAgentsRoute } from './agents/get';
import { createPOSTAgentsUnenrollRoute } from './agents/unenroll';
import { createPUTAgentsRoute } from './agents/put';
import {
  createGETEnrollmentApiKeysRoute,
  createPOSTEnrollmentApiKeysRoute,
  createDELETEEnrollmentApiKeyRoute,
  createGETEnrollmentApiKeyRoute,
} from './enrollment_api_keys';

export function initRestApi(server: Server, libs: FleetServerLib) {
  const frameworkAdapter = new HapiFrameworkAdapter(server);

  createAgentsRoutes(frameworkAdapter, libs);
  createEnrollmentApiKeysRoutes(frameworkAdapter, libs);

  frameworkAdapter.registerRoute(createGETArtifactsRoute(libs));
  frameworkAdapter.registerRoute(createGETInstallScript(libs));
}

function createAgentsRoutes(adapter: HapiFrameworkAdapter, libs: FleetServerLib) {
  adapter.registerRoute(createListAgentsRoute(libs));
  adapter.registerRoute(createGETAgentsRoute(libs));
  adapter.registerRoute(createPUTAgentsRoute(libs));
  adapter.registerRoute(createDeleteAgentsRoute(libs));
  adapter.registerRoute(createEnrollAgentsRoute(libs));
  adapter.registerRoute(createPOSTAgentsUnenrollRoute(libs));
  adapter.registerRoute(createCheckinAgentsRoute(libs));
  adapter.registerRoute(createAgentsAddActionRoute(libs));
  adapter.registerRoute(createGETAgentEventsRoute(libs));
}

function createEnrollmentApiKeysRoutes(adapter: HapiFrameworkAdapter, libs: FleetServerLib) {
  adapter.registerRoute(createGETEnrollmentApiKeysRoute(libs));
  adapter.registerRoute(createPOSTEnrollmentApiKeysRoute(libs));
  adapter.registerRoute(createDELETEEnrollmentApiKeyRoute(libs));
  adapter.registerRoute(createGETEnrollmentApiKeyRoute(libs));

  // enrollment rules
  adapter.registerRoute(createDeleteEnrollmentRuleRoute(libs));
  adapter.registerRoute(createGetEnrollmentRulesRoute(libs));
  adapter.registerRoute(createPostEnrollmentRulesRoute(libs));
}

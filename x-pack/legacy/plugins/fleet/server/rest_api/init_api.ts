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
import { FleetServerLibRequestFactory } from '../libs/compose/types';

export function initRestApi(server: Server, libs: FleetServerLibRequestFactory) {
  server.route(createListAgentsRoute(libs));
  server.route(createDeleteAgentsRoute(libs));
  server.route(createEnrollAgentsRoute(libs));
  server.route(createCheckinAgentsRoute(libs));
  server.route(createGetEnrollmentTokenRoute(libs));
}

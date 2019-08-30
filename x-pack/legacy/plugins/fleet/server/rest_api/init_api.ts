/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { FleetServerLib } from '../libs/types';
import { createListAgentsRoute } from './agents/list';
import { createDeleteAgentsRoute } from './agents/delete';
import { createEnrollAgentsRoute } from './agents/enroll';

export function initRestApi(server: Server, libs: FleetServerLib) {
  server.route(createListAgentsRoute(libs));
  server.route(createDeleteAgentsRoute(libs));
  server.route(createEnrollAgentsRoute(libs));
}

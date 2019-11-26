/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { HapiFrameworkAdapter } from '../libs/adapters/framework/hapi_framework_adapter';
import { ServerLibs } from '../libs/types';
import { createGETPoliciesRoute, createGETPoliciyRoute, createPOSTPoliciesRoute } from './policy';

export function initRestApi(server: Server, libs: ServerLibs) {
  const frameworkAdapter = new HapiFrameworkAdapter(server);

  // Policies route
  frameworkAdapter.registerRoute(createGETPoliciyRoute(libs));
  frameworkAdapter.registerRoute(createGETPoliciesRoute(libs));
  frameworkAdapter.registerRoute(createPOSTPoliciesRoute(libs));
}

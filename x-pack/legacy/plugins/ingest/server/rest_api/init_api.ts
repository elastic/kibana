/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { HapiFrameworkAdapter } from '../libs/adapters/framework/hapi_framework_adapter';
import { ServerLibs } from '../libs/types';
import { registerPolicyRoutes } from './policy';
import { registerDatasourceRoutes } from './datasource';

export function initRestApi(server: Server, libs: ServerLibs) {
  const frameworkAdapter = new HapiFrameworkAdapter(server);

  // Register routes
  registerPolicyRoutes(frameworkAdapter, libs);
  registerDatasourceRoutes(frameworkAdapter, libs);
}

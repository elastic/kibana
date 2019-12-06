/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { HapiFrameworkAdapter } from '../libs/adapters/framework/hapi_framework_adapter';
import { ServerLibs } from '../libs/types';
import {
  createGETPoliciesRoute,
  createGETPolicyRoute,
  createPOSTPoliciesRoute,
  createPUTPoliciesRoute,
  createAddPolicyDatasourceRoute,
  createRemovePolicyDatasourceRoute,
} from './policy';
import {
  createGETDatasourcesRoute,
  createGETDatasourceRoute,
  createPOSTDatasourcesRoute,
  createPUTDatasourcesRoute,
} from './datasource';

export function initRestApi(server: Server, libs: ServerLibs) {
  const frameworkAdapter = new HapiFrameworkAdapter(server);

  // Policies routes
  frameworkAdapter.registerRoute(createGETPolicyRoute(libs));
  frameworkAdapter.registerRoute(createGETPoliciesRoute(libs));
  frameworkAdapter.registerRoute(createPOSTPoliciesRoute(libs));
  frameworkAdapter.registerRoute(createPUTPoliciesRoute(libs));
  frameworkAdapter.registerRoute(createAddPolicyDatasourceRoute(libs));
  frameworkAdapter.registerRoute(createRemovePolicyDatasourceRoute(libs));

  // Datasources routes
  frameworkAdapter.registerRoute(createGETDatasourceRoute(libs));
  frameworkAdapter.registerRoute(createGETDatasourcesRoute(libs));
  frameworkAdapter.registerRoute(createPOSTDatasourcesRoute(libs));
  frameworkAdapter.registerRoute(createPUTDatasourcesRoute(libs));
}

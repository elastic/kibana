/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import {
  type APMSourcesRouteHandlerResources,
  getApmIndices,
  getApmIndexSettings,
} from './settings';

const createApmSourcesServerRoute = createServerRouteFactory<APMSourcesRouteHandlerResources, {}>();

// get apm indices configuration object
const apmIndicesRoute = createApmSourcesServerRoute({
  endpoint: 'GET /internal/apm-sources/settings/apm-indices',
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: getApmIndices,
});

const apmIndexSettingsRoute = createApmSourcesServerRoute({
  endpoint: 'GET /internal/apm-sources/settings/apm-index-settings',
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: getApmIndexSettings,
});

export const apmSourcesSettingsRouteRepository = {
  ...apmIndicesRoute,
  ...apmIndexSettingsRoute,
};

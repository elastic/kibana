/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  type ReturnOf,
  createServerRouteFactory,
  type EndpointOf,
  type ClientRequestParamsOf,
} from '@kbn/server-route-repository';
import type { SavedObject } from '@kbn/core/server';
import {
  type APMSourcesRouteHandlerResources,
  getApmIndices,
  getApmIndexSettings,
} from './settings';
import { saveApmIndices } from '../saved_objects/apm_indices';

const createApmSourcesServerRoute = createServerRouteFactory<APMSourcesRouteHandlerResources, {}>();

export type APMSourcesServerRouteRepository = typeof apmSourcesSettingsRouteRepository;

export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<
  APMSourcesServerRouteRepository,
  TEndpoint
>;

export type APIEndpoint = EndpointOf<APMSourcesServerRouteRepository>;

export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> = ClientRequestParamsOf<
  APMSourcesServerRouteRepository,
  TEndpoint
>;

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

const saveApmIndicesRoute = createApmSourcesServerRoute({
  endpoint: 'POST /internal/apm-sources/settings/apm-indices/save',
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  params: t.type({
    body: t.partial({
      error: t.string,
      onboarding: t.string,
      span: t.string,
      transaction: t.string,
      metric: t.string,
      // Keeping this one here for backward compatibility
      sourcemap: t.string,
    }),
  }),
  handler: async ({ params, context }): Promise<SavedObject<{}>> => {
    const {
      body: { sourcemap, ...indices },
    } = params;

    const coreContext = await context.core;

    return await saveApmIndices(coreContext.savedObjects.client, indices);
  },
});

export const apmSourcesSettingsRouteRepository = {
  ...apmIndicesRoute,
  ...apmIndexSettingsRoute,
  ...saveApmIndicesRoute,
};

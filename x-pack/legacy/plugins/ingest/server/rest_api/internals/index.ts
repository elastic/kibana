/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import {
  FrameworkRequest,
  FrameworkRouteHandler,
} from '../../libs/adapters/framework/adapter_types';
import { ServerLibs } from '../../libs/types';
import { HapiFrameworkAdapter } from '../../libs/adapters/framework/hapi_framework_adapter';

interface SetupResponse {
  isInitialized: boolean;
}

export const registerInternalsRoute = (
  frameworkAdapter: HapiFrameworkAdapter,
  libs: ServerLibs
) => {
  frameworkAdapter.registerRoute(createGETInternalsSetupRoute(libs));
  frameworkAdapter.registerRoute(createPOSTInternalsSetupRoute(libs));
};

const createGETInternalsSetupRoute = (libs: ServerLibs) => ({
  method: 'GET',
  path: '/api/ingest/internals/setup',
  config: {},
  handler: (async (
    request: FrameworkRequest<{ params: { policyId: string } }>
  ): Promise<SetupResponse> => {
    try {
      await libs.outputs.getByIDs(request.user, ['default']);
    } catch (e) {
      if (e.message.match(/No default output configured/)) {
        return { isInitialized: false };
      }
    }

    return { isInitialized: true };
  }) as FrameworkRouteHandler,
});

const createPOSTInternalsSetupRoute = (libs: ServerLibs) => ({
  method: 'POST',
  path: '/api/ingest/internals/setup',
  config: {
    validate: {
      payload: Joi.object({
        admin_username: Joi.string().required(),
        admin_password: Joi.string().required(),
      }).required(),
    },
  },
  handler: (async (
    request: FrameworkRequest<{
      payload: {
        admin_username: string;
        admin_password: string;
      };
    }>
  ): Promise<SetupResponse> => {
    await libs.outputs.createDefaultOutput(request.user, {
      username: request.payload.admin_username,
      password: request.payload.admin_password,
    });
    await libs.policy.ensureDefaultPolicy();
    return { isInitialized: true };
  }) as FrameworkRouteHandler,
});

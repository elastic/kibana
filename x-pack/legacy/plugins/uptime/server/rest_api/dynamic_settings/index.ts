/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { savedObjectsAdapter } from '../../lib/adapters';
import { UMDynamicSettingsType } from '../../lib/sources';
import { UMRestApiRouteFactory } from '..';

export const createGetDynamicSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/dynamic_settings',
  validate: false,
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ dynamicSettings }, _context, _request, response): Promise<any> => {
    return response.ok({
      body: {
        dynamic_settings: dynamicSettings,
      },
    });
  },
});

export const createPostDynamicSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'POST',
  path: '/api/uptime/dynamic_settings',
  validate: schema.object({}, { allowUnknowns: true }),
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ savedObjectsClient }, _context, request, response): Promise<any> => {
    // @ts-ignore
    const newSettings: UMDynamicSettingsType = request.body;
    await savedObjectsAdapter.setUptimeDynamicSettings(savedObjectsClient, newSettings);

    return response.ok({
      body: {
        dynamic_settings: request.body,
      },
    });
  },
});

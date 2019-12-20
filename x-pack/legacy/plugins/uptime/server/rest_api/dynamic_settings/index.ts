/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMRestApiRouteFactory } from '..';
import { UMServerLibs } from '../../lib/lib';
import { savedObjectsAdapter } from '../../lib/adapters';

export const createGetDynamicSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/dynamic_settings',
  validate: false,
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ sourceSettings }, _context, _request, response): Promise<any> => {
    return response.ok({
      body: {
        dynamic_settings: sourceSettings,
      },
    });
  },
});

export const createSetDynamicSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'PUT',
  path: '/api/uptime/dynamic_settings',
  validate: false,
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ savedObjectsClient }, _context, request, response): Promise<any> => {
    console.log("BODY IS", request.body);
    await savedObjectsAdapter.setUptimeSourceSettings(savedObjectsClient, JSON.parse(request.body));

    return response.ok({
      body: {
        dynamic_settings: request.body,
      },
    });
  },
});

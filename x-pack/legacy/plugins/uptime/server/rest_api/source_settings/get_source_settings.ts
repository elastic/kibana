/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createGetSourceSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/source_settings',
  validate: false,
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ savedObjectsClient: client }, _context, _request, response): Promise<any> => {
    try {
      return response.ok({
        ...await libs.savedObjects.getUptimeSourceSettings(client, undefined)
      });
    } catch (e) {
      return response.internalError({body: {message: e}});
    }
  }  
});
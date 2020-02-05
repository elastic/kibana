/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { isRight } from 'fp-ts/lib/Either';
import { UMServerLibs } from '../../lib/lib';
import { DynamicSettings, DynamicSettingsType } from '../../../common/runtime_types';
import { savedObjectsAdapter } from '../../lib/adapters/saved_objects/kibana_saved_objects_adapter';
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
      body: dynamicSettings,
    });
  },
});

export const createPostDynamicSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'POST',
  path: '/api/uptime/dynamic_settings',
  validate: false, // TODO add validation
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ savedObjectsClient }, _context, request, response): Promise<any> => {
    const decoded = DynamicSettingsType.decode(request.body);
    if (isRight(decoded)) {
      const newSettings: DynamicSettings = decoded.right;
      await savedObjectsAdapter.setUptimeDynamicSettings(savedObjectsClient, newSettings);

      return response.ok({
        body: {
          dynamic_settings: request.body,
        },
      });
    } else {
      throw new Error('Could not decode dynamic settings!');
    }
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPermissions } from '../../../lib/permissions';
import { Legacy, Server } from '../../../types';

export function registerPermissionsRoute(server: Server, legacy: Legacy, xpackInfo: any) {
  server.router.post(
    { path: '/api/license/permissions', validate: false },
    async (ctx, request, response) => {
      if (!xpackInfo) {
        // xpackInfo is updated via poll, so it may not be available until polling has begun.
        // In this rare situation, tell the client the service is temporarily unavailable.
        return response.customError({ statusCode: 503, body: 'Security info unavailable' });
      }

      try {
        return response.ok({
          body: await getPermissions(request, legacy.plugins.elasticsearch, xpackInfo),
        });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );
}

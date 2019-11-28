/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { startBasic } from '../../../lib/start_basic';
import { Server } from '../../../types';

export function registerStartBasicRoute(server: Server, xpackInfo: any) {
  server.router.post(
    {
      path: '/api/license/start_basic',
      validate: { query: schema.object({ acknowledge: schema.string() }) },
    },
    async (ctx, request, response) => {
      try {
        return response.ok({
          body: await startBasic(request, server.plugins.elasticsearch, xpackInfo),
        });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { putLicense } from '../../../lib/license';
import { Legacy, Server } from '../../../types';

export function registerLicenseRoute(server: Server, legacy: Legacy, xpackInfo: any) {
  server.router.put(
    {
      path: '/api/license',
      validate: {
        query: schema.object({ acknowledge: schema.string() }),
        body: schema.object({
          license: schema.object({}, { allowUnknowns: true }),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        return response.ok({
          body: await putLicense(request, legacy.plugins.elasticsearch, xpackInfo),
        });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );
}

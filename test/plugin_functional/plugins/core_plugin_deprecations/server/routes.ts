/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpServiceSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export function registerRoutes(http: HttpServiceSetup) {
  const router = http.createRouter();
  router.post(
    {
      path: '/api/core_deprecations_resolve/',
      validate: {
        body: schema.object({
          mockFail: schema.maybe(schema.boolean()),
          keyId: schema.maybe(schema.string()),
          deprecationDetails: schema.object({
            domainId: schema.string(),
          }),
        }),
      },
    },
    async (context, req, res) => {
      const { mockFail, keyId } = req.body;
      if (mockFail === true) {
        return res.badRequest({
          body: new Error('Mocking api failure'),
        });
      }

      if (keyId) {
        const client = context.core.savedObjects.getClient();
        await client.delete('test-deprecations-plugin', keyId, {
          refresh: true,
        });
      }

      return res.ok();
    }
  );
}

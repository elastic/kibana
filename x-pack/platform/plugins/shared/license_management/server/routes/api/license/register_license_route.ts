/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { putLicense } from '../../../lib/license';
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '../../helpers';

export function registerLicenseRoute({
  router,
  lib: { handleEsError },
  plugins: { licensing },
}: RouteDependencies) {
  router.put(
    {
      path: addBasePath(''),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        query: schema.object({ acknowledge: schema.string() }),
        body: schema.object({
          license: schema.object({}, { unknowns: 'allow' }),
        }),
      },
    },
    async (ctx, req, res) => {
      const { client } = (await ctx.core).elasticsearch;
      try {
        return res.ok({
          body: await putLicense({
            acknowledge: Boolean(req.query.acknowledge),
            client,
            licensing,
            licenses: [req.body.license as any],
          }),
        });
      } catch (error) {
        return handleEsError({ error, response: res });
      }
    }
  );
}

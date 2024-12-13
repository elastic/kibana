/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';
import { handleEsError } from '../../shared_imports';

const bodySchema = schema.string();

export function registerExecuteRoute({ router, license }: RouteDependencies) {
  router.post(
    {
      path: `${API_BASE_PATH}/execute`,
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const body = req.body;

      try {
        const client = (await ctx.core).elasticsearch.client.asCurrentUser;
        const response = await client.scriptsPainlessExecute(
          {
            // @ts-expect-error `ExecutePainlessScriptRequest.body` does not allow `string`
            body,
          },
          {
            headers: {
              'content-type': 'application/json',
            },
          }
        );

        return res.ok({
          body: response,
        });
      } catch (error) {
        // Assume invalid painless script was submitted
        // Return 200 with error object
        const handleCustomError = () => {
          return res.ok({
            body: error.body,
          });
        };

        return handleEsError({ error, response: res, handleCustomError });
      }
    })
  );
}

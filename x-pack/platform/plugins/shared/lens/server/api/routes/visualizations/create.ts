/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CONTENT_ID } from '../../../../common/content_management';
import {
  PUBLIC_API_PATH,
  PUBLIC_API_VERSION,
  PUBLIC_API_CONTENT_MANAGEMENT_VERSION,
  PUBLIC_API_ACCESS,
} from '../../constants';
import {
  lensAttributesSchema,
  lensCreateOptionsSchema,
  lensCreateResultSchema,
} from '../../../content_management/v1';
import { RegisterAPIRouteFn } from '../../types';

export const registerLensVisualizationsCreateAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const createRoute = router.post({
    path: `${PUBLIC_API_PATH}/visualizations`,
    access: PUBLIC_API_ACCESS,
    enableQueryVersion: true,
    summary: 'Create a Lens visualization',
    options: {
      tags: ['oas-tag:Lens'],
      availability: {
        stability: 'experimental',
      },
    },
    security: {
      authz: {
        enabled: false,
        reason: 'Relies on Content Client for authorization',
      },
    },
  });

  createRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            // should we allow custom ids?
            id: schema.maybe(
              schema.string({
                meta: {
                  description: 'The saved object ID of the Lens visualization.',
                },
              })
            ),
          }),
          body: schema.object({
            options: lensCreateOptionsSchema,
            data: lensAttributesSchema,
          }),
        },
        response: {
          200: {
            body: () => lensCreateResultSchema,
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { data, options } = req.body;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
      let result;
      try {
        ({ result } = await client.create(data, options));
      } catch (e) {
        // TODO prevent duplicate titles?

        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }

        return res.badRequest();
      }

      return res.ok({ body: result });
    }
  );
};

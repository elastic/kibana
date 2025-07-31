/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { boomify, isBoom } from '@hapi/boom';
import { CONTENT_ID, type LensSavedObject } from '../../../../common/content_management';
import {
  PUBLIC_API_PATH,
  PUBLIC_API_VERSION,
  PUBLIC_API_CONTENT_MANAGEMENT_VERSION,
  PUBLIC_API_ACCESS,
} from '../../constants';
import {
  lensAttributesSchema,
  lensCreateOptionsSchema,
  lensSavedObjectSchema,
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
    summary: 'Create Lens visualization',
    description: 'Create a new Lens visualization.',
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
          body: schema.object({
            options: lensCreateOptionsSchema,
            data: lensAttributesSchema,
          }),
        },
        response: {
          201: {
            body: () => lensSavedObjectSchema,
            description: 'Created',
          },
          400: {
            description: 'Malformed request',
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden',
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    async (ctx, req, res) => {
      let result;
      const { data, options } = req.body;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<LensSavedObject>(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);

      try {
        ({ result } = await client.create(data, options));
      } catch (error) {
        if (isBoom(error) && error.output.statusCode === 403) {
          return res.forbidden();
        }

        return boomify(error); // forward unknown error
      }

      return res.created({ body: result.item });
    }
  );
};

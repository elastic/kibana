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
import { RegisterAPIRouteFn } from '../../types';

export const registerLensVisualizationsDeleteAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const deleteRoute = router.delete({
    path: `${PUBLIC_API_PATH}/visualizations/{id}`,
    access: PUBLIC_API_ACCESS,
    enableQueryVersion: true,
    summary: 'Delete Lens visualization',
    description: 'Delete a Lens visualization by id.',
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

  deleteRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'The saved object id of a Lens visualization.',
              },
            }),
          }),
        },
        response: {
          204: {
            description: 'No Content',
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
          404: {
            description: 'Resource not found',
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    async (ctx, req, res) => {
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<LensSavedObject>(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);

      try {
        await client.delete(req.params.id);
      } catch (error) {
        if (isBoom(error)) {
          if (error.output.statusCode === 404) {
            return res.notFound({
              body: {
                message: `A Lens visualization with saved object id [${req.params.id}] was not found.`,
              },
            });
          }
          if (error.output.statusCode === 403) {
            return res.forbidden();
          }
        }

        return boomify(error); // forward unknown error
      }

      return res.noContent();
    }
  );
};

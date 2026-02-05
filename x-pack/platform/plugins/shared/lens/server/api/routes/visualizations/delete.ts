/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify, isBoom } from '@hapi/boom';
import { LENS_CONTENT_TYPE } from '@kbn/lens-common/content_management/constants';
import { LENS_VIS_API_PATH, LENS_API_VERSION, LENS_API_ACCESS } from '../../../../common/constants';
import type { LensSavedObject } from '../../../content_management';
import type { RegisterAPIRouteFn } from '../../types';
import { lensDeleteRequestParamsSchema } from './schema';

export const registerLensVisualizationsDeleteAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const deleteRoute = router.delete({
    path: `${LENS_VIS_API_PATH}/{id}`,
    access: LENS_API_ACCESS,
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
      version: LENS_API_VERSION,
      validate: {
        request: {
          params: lensDeleteRequestParamsSchema,
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
      // TODO fix IContentClient to type this client based on the actual
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<LensSavedObject>(LENS_CONTENT_TYPE);

      try {
        const { result } = await client.delete(req.params.id);

        if (!result.success) {
          throw new Error(`Failed to delete Lens visualization with id [${req.params.id}].`);
        }

        return res.noContent();
      } catch (error) {
        if (isBoom(error)) {
          if (error.output.statusCode === 404) {
            return res.notFound({
              body: {
                message: `A Lens visualization with id [${req.params.id}] was not found.`,
              },
            });
          }
          if (error.output.statusCode === 403) {
            return res.forbidden();
          }
        }

        return boomify(error); // forward unknown error
      }
    }
  );
};

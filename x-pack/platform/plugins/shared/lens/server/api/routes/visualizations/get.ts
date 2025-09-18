/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify, isBoom } from '@hapi/boom';

import type { TypeOf } from '@kbn/config-schema';

import {
  LENS_VIS_API_PATH,
  LENS_API_VERSION,
  LENS_API_ACCESS,
  LENS_CONTENT_TYPE,
} from '../../../../common/constants';
import type { LensSavedObject } from '../../../content_management';
import type { RegisterAPIRouteFn } from '../../types';
import { lensGetRequestParamsSchema, lensGetResponseBodySchema } from './schema';
import { getLensResponseItem } from '../utils';

export const registerLensVisualizationsGetAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const getRoute = router.get({
    path: `${LENS_VIS_API_PATH}/{id}`,
    access: LENS_API_ACCESS,
    enableQueryVersion: true,
    summary: 'Get Lens visualization',
    description: 'Get a Lens visualization from id.',
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

  getRoute.addVersion(
    {
      version: LENS_API_VERSION,
      validate: {
        request: {
          params: lensGetRequestParamsSchema,
        },
        response: {
          200: {
            body: () => lensGetResponseBodySchema,
            description: 'Ok',
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
        const { result } = await client.get(req.params.id);

        if (result.item.error) {
          throw result.item.error;
        }

        const body = getLensResponseItem(result.item);
        return res.ok<TypeOf<typeof lensGetResponseBodySchema>>({
          body: {
            ...body,
            meta: {
              ...body.meta,
              ...result.meta,
            },
          },
        });
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

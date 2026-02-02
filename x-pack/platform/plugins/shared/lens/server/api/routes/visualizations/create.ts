/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify, isBoom } from '@hapi/boom';

import { LENS_CONTENT_TYPE } from '@kbn/lens-common/content_management/constants';
import { LENS_VIS_API_PATH, LENS_API_VERSION, LENS_API_ACCESS } from '../../../../common/constants';
import type { LensCreateIn, LensSavedObject } from '../../../content_management';
import type { LensCreateResponseBody, RegisterAPIRouteFn } from '../../types';
import {
  lensCreateRequestBodySchema,
  lensCreateRequestParamsSchema,
  lensCreateRequestQuerySchema,
  lensCreateResponseBodySchema,
} from './schema';
import { getLensRequestConfig, getLensResponseItem } from '../utils';

export const registerLensVisualizationsCreateAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement, builder }
) => {
  const createRoute = router.post({
    path: `${LENS_VIS_API_PATH}/{id?}`,
    access: LENS_API_ACCESS,
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
      version: LENS_API_VERSION,
      validate: {
        request: {
          query: lensCreateRequestQuerySchema,
          params: lensCreateRequestParamsSchema,
          body: lensCreateRequestBodySchema,
        },
        response: {
          201: {
            body: () => lensCreateResponseBodySchema,
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
      const requestBodyData = req.body;
      if ('state' in requestBodyData && !requestBodyData.visualizationType) {
        throw new Error('visualizationType is required');
      }

      // TODO fix IContentClient to type this client based on the actual
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<LensSavedObject>(LENS_CONTENT_TYPE);

      try {
        // Note: these types are to enforce loose param typings of client methods
        const { references, ...data } = getLensRequestConfig(builder, req.body);
        const options: LensCreateIn['options'] = { ...req.query, references, id: req.params.id };
        const { result } = await client.create(data, options);

        if (result.item.error) {
          throw result.item.error;
        }

        const responseItem = getLensResponseItem(builder, result.item);
        return res.created<LensCreateResponseBody>({
          body: responseItem,
        });
      } catch (error) {
        if (isBoom(error) && error.output.statusCode === 403) {
          return res.forbidden();
        }

        return boomify(error); // forward unknown error
      }
    }
  );
};

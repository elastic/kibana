/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify, isBoom } from '@hapi/boom';

import { isLensLegacyAttributes } from '@kbn/lens-embeddable-utils/config_builder/utils';
import { LENS_CONTENT_TYPE } from '@kbn/lens-common/content_management/constants';
import { LENS_VIS_API_PATH, LENS_API_VERSION, LENS_API_ACCESS } from '../../../../common/constants';
import type { LensUpdateIn, LensSavedObject } from '../../../content_management';
import type { LensUpdateResponseBody, RegisterAPIRouteFn } from '../../types';
import {
  lensUpdateRequestBodySchema,
  lensUpdateRequestParamsSchema,
  lensUpdateRequestQuerySchema,
  lensUpdateResponseBodySchema,
} from './schema';
import { getLensRequestConfig, getLensResponseItem } from '../utils';

export const registerLensVisualizationsUpdateAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement, builder }
) => {
  const updateRoute = router.put({
    path: `${LENS_VIS_API_PATH}/{id}`,
    access: LENS_API_ACCESS,
    enableQueryVersion: true,
    summary: 'Update Lens visualization',
    description: 'Update an existing Lens visualization.',
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

  updateRoute.addVersion(
    {
      version: LENS_API_VERSION,
      validate: {
        request: {
          params: lensUpdateRequestParamsSchema,
          body: lensUpdateRequestBodySchema,
          query: lensUpdateRequestQuerySchema,
        },
        response: {
          200: {
            body: () => lensUpdateResponseBodySchema,
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
      const requestBodyData = req.body;
      if (isLensLegacyAttributes(requestBodyData) && !requestBodyData.visualizationType) {
        throw new Error('visualizationType is required');
      }

      // TODO fix IContentClient to type this client based on the actual
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<LensSavedObject>(LENS_CONTENT_TYPE);

      // Note: these types are to enforce loose param typings of client methods
      const { references, ...data } = getLensRequestConfig(builder, req.body);
      const options: LensUpdateIn['options'] = { ...req.query, references };

      try {
        const { result } = await client.update(req.params.id, data, options);

        if (result.item.error) {
          throw result.item.error;
        }

        const responseItem = getLensResponseItem(builder, result.item);
        return res.ok<LensUpdateResponseBody>({
          body: responseItem,
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

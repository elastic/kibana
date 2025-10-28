/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { boomify, isBoom } from '@hapi/boom';
import type { TypeOf } from '@kbn/config-schema';

import {
  LENS_VIS_API_PATH,
  LENS_API_VERSION,
  LENS_API_ACCESS,
  LENS_CONTENT_TYPE,
} from '../../../../common/constants';
import type { LensUpdateIn, LensSavedObject } from '../../../content_management';
import type { RegisterAPIRouteFn } from '../../types';
import { ConfigBuilderStub } from '../../../../common/transforms';
import {
  lensUpdateRequestBodySchema,
  lensUpdateRequestParamsSchema,
  lensUpdateResponseBodySchema,
} from './schema';
import { getLensResponseItem } from '../utils';

export const registerLensVisualizationsUpdateAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
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
      const requestBodyData = req.body.data;
      if (!requestBodyData.visualizationType) {
        throw new Error('visualizationType is required');
      }

      // TODO fix IContentClient to type this client based on the actual
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<LensSavedObject>(LENS_CONTENT_TYPE);

      const { references, ...lensItem } = omit(
        ConfigBuilderStub.in({
          id: '', // TODO: Find a better way to conditionally omit id
          ...req.body.data,
        }),
        'id'
      );

      try {
        // Note: these types are to enforce loose param typings of client methods
        const data: LensUpdateIn['data'] = lensItem;
        const options: LensUpdateIn['options'] = { references };
        const { result } = await client.update(req.params.id, data, options);

        if (result.item.error) {
          throw result.item.error;
        }

        return res.ok<TypeOf<typeof lensUpdateResponseBodySchema>>({
          body: getLensResponseItem(result.item),
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom, boomify } from '@hapi/boom';

import type { TypeOf } from '@kbn/config-schema';
import {
  LENS_VIS_API_PATH,
  LENS_API_VERSION,
  LENS_API_ACCESS,
  LENS_CONTENT_TYPE,
} from '../../../../common/constants';
import type { LensSearchIn, LensSavedObject } from '../../../content_management';
import type { RegisterAPIRouteFn } from '../../types';
import { lensSearchRequestQuerySchema, lensSearchResponseBodySchema } from './schema';
import { getLensResponseItem } from '../utils';

export const registerLensVisualizationsSearchAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const searchRoute = router.get({
    path: LENS_VIS_API_PATH,
    access: LENS_API_ACCESS,
    enableQueryVersion: true,
    summary: 'Search Lens visualizations',
    description: 'Get list of Lens visualizations.',
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

  searchRoute.addVersion(
    {
      version: LENS_API_VERSION,
      validate: {
        request: {
          query: lensSearchRequestQuerySchema,
        },
        response: {
          200: {
            body: () => lensSearchResponseBodySchema,
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

      const { query: q, page, perPage, ...reqOptions } = req.query;

      try {
        // Note: these types are to enforce loose param typings of client methods
        const query: LensSearchIn['query'] = {
          text: q,
          cursor: page.toString(),
          limit: perPage,
        };
        const options: LensSearchIn['options'] = reqOptions;

        const {
          result: { hits, pagination },
        } = await client.search(query, options);

        // TODO: see if this check is actually needed
        const error = hits.find((item) => item.error);
        if (error) {
          throw error;
        }

        return res.ok<TypeOf<typeof lensSearchResponseBodySchema>>({
          body: {
            data: hits.map((item) => {
              return getLensResponseItem(item);
            }),
            meta: {
              page,
              perPage,
              total: pagination.total,
            },
          },
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isBoom, boomify } from '@hapi/boom';
import { CONTENT_ID, type LensSavedObject } from '../../../../common/content_management';
import {
  PUBLIC_API_PATH,
  PUBLIC_API_VERSION,
  PUBLIC_API_CONTENT_MANAGEMENT_VERSION,
  PUBLIC_API_ACCESS,
} from '../../constants';
import { lensSavedObjectSchema } from '../../../content_management/v1';
import { RegisterAPIRouteFn } from '../../types';

export const registerLensVisualizationsSearchAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const searchRoute = router.get({
    path: `${PUBLIC_API_PATH}/visualizations`,
    access: PUBLIC_API_ACCESS,
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
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          query: schema.object({
            query: schema.maybe(
              schema.string({
                meta: {
                  description: 'The text to search for Lens visualizations',
                },
              })
            ),
            page: schema.number({
              meta: {
                description: 'Specifies the current page number of the paginated result.',
              },
              min: 1,
              defaultValue: 1,
            }),
            perPage: schema.number({
              meta: {
                description: 'Maximum number of Lens visualizations included in a single response',
              },
              defaultValue: 20,
              min: 1,
              max: 1000,
            }),
          }),
        },
        response: {
          200: {
            body: () => schema.arrayOf(lensSavedObjectSchema),
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
      let result;
      const { query, page, perPage: limit } = req.query;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<LensSavedObject>(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);

      try {
        ({ result } = await client.search(
          {
            text: query,
            cursor: page.toString(),
            limit,
          },
          {
            searchFields: ['title', 'description'],
          }
        ));
      } catch (error) {
        if (isBoom(error) && error.output.statusCode === 403) {
          return res.forbidden();
        }

        return boomify(error); // forward unknown error
      }

      return res.ok({ body: result.hits });
    }
  );
};

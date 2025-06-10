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
import { lensSearchResultSchema } from '../../../content_management/v1';
import { RegisterAPIRouteFn } from '../../types';

export const registerLensVisualizationsSearchAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const searchRoute = router.get({
    path: `${PUBLIC_API_PATH}/visualizations`,
    access: PUBLIC_API_ACCESS,
    enableQueryVersion: true,
    summary: `Get a list of Lens visualizations`,
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
                description: 'The page number to return. Default is "1".',
              },
              min: 1,
              defaultValue: 1,
            }),
            perPage: schema.number({
              meta: {
                description:
                  'The number of dashboards to display on each page (max 1000). Default is "20".',
              },
              defaultValue: 20,
              min: 1,
              max: 1000,
            }),
          }),
        },
        response: {
          200: {
            body: () => lensSearchResultSchema,
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { query, page, perPage: limit } = req.query;
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
      let result;
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
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }

        return res.badRequest();
      }

      const body = {
        items: result.hits,
        total: result.pagination.total,
      };
      return res.ok({ body });
    }
  );
};

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
import { RegisterAPIRouteFn } from '../../types';

export const registerLensVisualizationsDeleteAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const deleteRoute = router.delete({
    path: `${PUBLIC_API_PATH}/visualizations/{id}`,
    access: PUBLIC_API_ACCESS,
    enableQueryVersion: true,
    summary: `Delete a Lens visualization`,
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
                description: 'The saved object ID of the Lens visualization.',
              },
            }),
          }),
        },
      },
    },
    async (ctx, req, res) => {
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);
      try {
        await client.delete(req.params.id);
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A Lens visualization with saved object ID ${req.params.id} was not found.`,
            },
          });
        }
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden();
        }
        return res.badRequest();
      }

      return res.ok();
    }
  );
};

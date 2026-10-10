/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify, isBoom } from '@hapi/boom';

import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { isLensLegacyAttributes } from '@kbn/lens-embeddable-utils';
import { LENS_CONTENT_TYPE } from '@kbn/lens-common/content_management/constants';

import {
  LENS_VIS_API_PATH,
  LENS_API_VERSION,
  LENS_API_ACCESS,
  LENS_API_TAG,
} from '../../../../common/constants';
import type { LensUpdateIn, LensSavedObject } from '../../../content_management/zod';

import type { RegisterAPIRouteFn } from '../../types';
import type { LensUpdateResponseBody } from './types';
import {
  lensUpdateRequestBodySchema,
  lensUpdateRequestParamsSchema,
  lensUpdateResponseBodySchema,
} from './schema';
import { getLensRequestConfig, getLensResponseItem } from './utils';

export const registerLensVisualizationsUpdateAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement, builder, usageCounter }
) => {
  const updateRoute = router.put({
    path: `${LENS_VIS_API_PATH}/{id}`,
    access: LENS_API_ACCESS,
    summary: 'Upsert visualization',
    operationId: 'upsert-visualization',
    description: [
      'Replaces the full configuration of an existing Lens visualization. Partial updates are not supported.',
      'To make incremental changes, retrieve the visualization first, modify the fields you need, then send the complete object back.',
      '',
      'If no visualization exists with the specified ID, a new one is created.',
      '',
      'ES|QL visualizations cannot be updated through this endpoint.',
    ].join('\n'),
    options: {
      tags: [LENS_API_TAG],
      availability: {
        stability: 'stable',
        since: '9.5.0',
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
      options: {
        oasOperationObject: async () =>
          (await import('./oas_examples')).updateLensVisualizationOASOperationObject,
      },
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
          201: {
            body: () => lensUpdateResponseBodySchema,
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
    async (ctx, req, res) =>
      telemetryHandler(req, { usageCounter, trackAgentic: true }, async () => {
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
        const updateOptions: LensUpdateIn['options'] = { references };

        try {
          // Apply as-code ID rules only when this upsert would create a new visualization.
          // Existing Saved Object IDs remain updateable even if they do not satisfy that schema.
          const idValidation = asCodeIdSchema.safeParse(req.params.id);
          if (!idValidation.success) {
            try {
              await client.get(req.params.id);
            } catch (error) {
              if (isBoom(error) && error.output.statusCode === 404) {
                return res.badRequest({ body: { message: idValidation.error.message } });
              }
              throw error;
            }
          }

          const { result: updateResult } = await client.update(req.params.id, data, updateOptions);
          if (updateResult.item.error) {
            throw updateResult.item.error;
          }

          // Saved Objects only returns creation metadata when update takes the upsert path.
          const createdNew = updateResult.item.createdAt !== undefined;
          const { result: persistedResult } = await client.get(req.params.id);
          const responseItem = lensUpdateResponseBodySchema.parse(
            getLensResponseItem(builder, persistedResult.item)
          );

          if (createdNew) {
            return res.created<LensUpdateResponseBody>({
              body: responseItem,
            });
          }

          return res.ok<LensUpdateResponseBody>({
            body: responseItem,
          });
        } catch (error) {
          if (isBoom(error) && error.output.statusCode === 403) {
            return res.forbidden();
          }

          return boomify(error); // forward unknown error
        }
      })
  );
};

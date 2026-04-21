/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformIdParamSchema, type TransformIdParamSchema } from '../../api_schemas/common';
import {
  putTransformsRequestSchema,
  type PutTransformsRequestSchema,
  putTransformQuerySchema,
  type PutTransformQuerySchema,
} from '../../api_schemas/transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandlerFactory } from './route_handler_factory';

export function registerRoute(routeDependencies: RouteDependencies) {
  const { router, getLicense } = routeDependencies;

  /**
   * @apiGroup Transforms
   *
   * @api {put} /internal/transform/transforms/:transformId Put transform
   * @apiName PutTransform
   * @apiDescription Creates a transform
   *
   * @apiSchema (params) transformIdParamSchema
   * @apiSchema (query) transformIdParamSchema
   * @apiSchema (body) putTransformsRequestSchema
   */
  router.versioned
    .put({
      path: addInternalBasePath('transforms/{transformId}'),
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because permissions will be checked by elasticsearch',
        },
      },
    })
    .addVersion<TransformIdParamSchema, PutTransformQuerySchema, PutTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
            query: putTransformQuerySchema,
            body: putTransformsRequestSchema,
          },
        },
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<
          TransformIdParamSchema,
          PutTransformQuerySchema,
          PutTransformsRequestSchema
        >(routeHandlerFactory(routeDependencies))(ctx, request, response);
      }
    );
}

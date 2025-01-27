/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deleteTransformsRequestSchema,
  type DeleteTransformsRequestSchema,
} from '../../api_schemas/delete_transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandlerFactory } from './route_handler_factory';

export function registerRoute(routeDependencies: RouteDependencies) {
  const { router, getLicense } = routeDependencies;
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/delete_transforms Post delete transforms
   * @apiName DeleteTransforms
   * @apiDescription Deletes transforms
   *
   * @apiSchema (body) deleteTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('delete_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, DeleteTransformsRequestSchema>(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization because permissions will be checked by elasticsearch',
          },
        },
        validate: {
          request: {
            body: deleteTransformsRequestSchema,
          },
        },
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<undefined, undefined, DeleteTransformsRequestSchema>(
          routeHandlerFactory(routeDependencies)
        )(ctx, request, response);
      }
    );
}

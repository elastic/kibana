/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, getLicense }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {get} /internal/transform/transforms Get transforms
   * @apiName GetTransforms
   * @apiDescription Returns transforms
   *
   * @apiSchema (params) jobAuditMessagesJobIdSchema
   * @apiSchema (query) jobAuditMessagesQuerySchema
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms'),
      access: 'internal',
    })
    .addVersion<estypes.TransformGetTransformRequest, undefined, undefined>(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization because permissions will be checked by elasticsearch',
          },
        },
        validate: false,
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<estypes.TransformGetTransformRequest, undefined, undefined>(
          routeHandler
        )(ctx, request, response);
      }
    );
}

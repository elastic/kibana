/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  updateTransformsProjectScopeRequestSchema,
  type UpdateTransformsProjectScopeRequestSchema,
} from '../../api_schemas/update_transforms_project_scope';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, getLicense }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/update_transforms_project_scope Update transforms project scope
   * @apiName PostUpdateTransformsProjectScope
   * @apiDescription Updates project scope for transforms
   *
   * @apiSchema (body) updateTransformsProjectScopeRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('update_transforms_project_scope'),
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because permissions will be checked by elasticsearch',
        },
      },
    })
    .addVersion<undefined, undefined, UpdateTransformsProjectScopeRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: updateTransformsProjectScopeRequestSchema,
          },
        },
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<
          undefined,
          undefined,
          UpdateTransformsProjectScopeRequestSchema
        >(routeHandler)(ctx, request, response);
      }
    );
}

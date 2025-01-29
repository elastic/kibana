/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandlerFactory } from './route_handler_factory';

export function registerRoute({ router, getLicense }: RouteDependencies) {
  /**
   * @apiGroup Transform Nodes
   *
   * @api {get} /internal/transforms/_nodes Transform Nodes
   * @apiName GetTransformNodes
   * @apiDescription Get transform nodes
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/_nodes'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, undefined>(
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
        return license.guardApiRoute<undefined, undefined, undefined>(routeHandlerFactory(license))(
          ctx,
          request,
          response
        );
      }
    );
}

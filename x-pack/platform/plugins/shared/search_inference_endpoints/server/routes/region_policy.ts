/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { APIRoutes } from '../../common/types';
import { errorHandler } from '../utils/error_handler';
import { getRegionPolicy, putRegionPolicy, deleteRegionPolicy } from '../lib/region_policy';

export const defineRegionPolicyRoutes = ({
  logger,
  router,
}: {
  logger: Logger;
  router: IRouter;
}) => {
  router.get(
    {
      path: APIRoutes.REGION_POLICY,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
    },
    errorHandler(logger)(async (context, request, response) => {
      const {
        client: { asCurrentUser },
      } = (await context.core).elasticsearch;

      const policy = await getRegionPolicy(asCurrentUser);
      return response.ok({ body: policy, headers: { 'content-type': 'application/json' } });
    })
  );

  router.put(
    {
      path: APIRoutes.REGION_POLICY,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        body: schema.object({
          allowed_regions: schema.maybe(
            schema.arrayOf(
              schema.object({
                csp: schema.string(),
                region: schema.string(),
              })
            )
          ),
          allowed_geos: schema.maybe(schema.arrayOf(schema.string())),
          fallback_region: schema.maybe(
            schema.object({
              csp: schema.string(),
              region: schema.string(),
            })
          ),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const {
        client: { asCurrentUser },
      } = (await context.core).elasticsearch;

      const policy = await putRegionPolicy(asCurrentUser, request.body);
      return response.ok({ body: policy, headers: { 'content-type': 'application/json' } });
    })
  );

  router.delete(
    {
      path: APIRoutes.REGION_POLICY,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
    },
    errorHandler(logger)(async (context, request, response) => {
      const {
        client: { asCurrentUser },
      } = (await context.core).elasticsearch;

      await deleteRegionPolicy(asCurrentUser);
      return response.ok({ body: { acknowledged: true } });
    })
  );
};

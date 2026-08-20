/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from '../../utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES, type ResolutionRuleId } from '../../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../../constants';
import type { EntityStorePluginRouter } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';
import { ruleIdParamsSchema } from './params';

export function registerResolutionRulesDisable(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_DISABLE,
      access: 'public',
      summary: 'Disable an entity resolution rule',
      description: 'Disable a managed entity resolution rule in this space.',
      options: {
        tags: ['oas-tag:Security entity store'],
        availability: {
          since: '9.5.0',
          stability: 'stable',
        },
      },
      security: {
        authz: RESOLUTION_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildStrictRouteValidationWithZod(ruleIdParamsSchema),
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../../examples/resolution_rules_disable.yaml'),
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, entityResolutionRuleClient } = await ctx.entityStore;

          try {
            const rule = await entityResolutionRuleClient.setEnabled(
              req.params.id as ResolutionRuleId,
              false
            );
            return res.ok({ body: rule });
          } catch (error) {
            if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
              return res.customError({ statusCode: 404, body: error });
            }

            logger.error(error);
            throw error;
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );
}

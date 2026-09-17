/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../../constants';
import type { EntityStorePluginRouter } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';

export function registerResolutionRulesList(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_LIST,
      access: 'public',
      summary: 'List entity resolution rules',
      description:
        'List managed entity resolution rules and their effective enabled state for this space.',
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
        validate: false,
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../../examples/resolution_rules_list.yaml'),
        },
      },
      wrapMiddlewares(
        async (ctx, _req, res): Promise<IKibanaResponse> => {
          const { entityResolutionRuleClient } = await ctx.entityStore;
          const rules = await entityResolutionRuleClient.getEffectiveRules();

          return res.ok({ body: { rules } });
        },
        [enterpriseLicenseMiddleware]
      )
    );
}

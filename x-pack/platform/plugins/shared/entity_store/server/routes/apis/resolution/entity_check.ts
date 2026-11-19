/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from '../utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter, EntityStoreRequestHandlerContext } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { enterpriseLicenseMiddleware } from '../../middleware/enterprise_license';
import { EntitiesNotFoundError, EntityStoreNotInstalledError } from '../../../domain/errors';
import { resolveLatestEntitiesIndexName } from '../../../domain/asset_manager/resolve_entity_store_indices';
import { checkEntityRules } from '../../../domain/resolution/rules';
import { MAINTAINER_ID } from '../../../domain/resolution/rules/maintainers/automated_resolution';
import type { AutomatedResolutionState } from '../../../domain/resolution/rules/maintainers/automated_resolution/types';

const MAX_ENTITY_ID_LENGTH = 1024;

const querySchema = lazySchema(() =>
  z.object({
    entity_id: z
      .string()
      .min(1)
      .max(MAX_ENTITY_ID_LENGTH)
      .describe('The entity identifier to check the resolution rules against.'),
  })
);

type EntityCheckRequestQuery = z.infer<typeof querySchema>;

const toAutomatedResolutionState = (state: unknown): AutomatedResolutionState | null => {
  if (typeof state !== 'object' || state === null || !('rules' in state)) {
    return null;
  }
  const { rules } = state;
  return typeof rules === 'object' && rules !== null ? (state as AutomatedResolutionState) : null;
};

export async function handleResolutionEntityCheck(
  ctx: EntityStoreRequestHandlerContext,
  req: KibanaRequest<unknown, EntityCheckRequestQuery, unknown>,
  res: KibanaResponseFactory
): Promise<IKibanaResponse> {
  const { logger, core, entityMaintainersClient, entityResolutionRuleClient, namespace } =
    await ctx.entityStore;
  const esClient = core.elasticsearch.client.asCurrentUser;

  try {
    const index = await resolveLatestEntitiesIndexName(esClient, namespace);
    if (!(await esClient.indices.exists({ index }))) {
      throw new EntityStoreNotInstalledError();
    }

    const [rules, maintainers] = await Promise.all([
      entityResolutionRuleClient.getEffectiveRules(),
      entityMaintainersClient.getMaintainers([MAINTAINER_ID]),
    ]);
    const maintainerState = toAutomatedResolutionState(maintainers[0]?.taskSnapshot?.state);

    const check = await checkEntityRules(req.query.entity_id, {
      esClient,
      index,
      rules,
      maintainerState,
    });
    return res.ok({ body: check });
  } catch (error) {
    if (error instanceof EntitiesNotFoundError || error instanceof EntityStoreNotInstalledError) {
      return res.notFound({ body: { message: error.message } });
    }
    logger.error(error);
    throw error;
  }
}

/**
 * PROTOTYPE, internal only. Checks every built-in resolution rule against one entity and says,
 * per rule, whether it is failing, has no data, declined the entity's group, would link it, or
 * does not apply. Read-only.
 */
export function registerResolutionEntityCheck(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.internal.RESOLUTION_ENTITY_CHECK,
      access: 'internal',
      summary: 'Check the resolution rules against one entity',
      security: { authz: RESOLUTION_ENTITY_STORE_PERMISSIONS },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: {
            query: buildStrictRouteValidationWithZod(querySchema),
          },
        },
      },
      wrapMiddlewares(handleResolutionEntityCheck, [enterpriseLicenseMiddleware])
    );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from '../utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { enforceEntityStorePrivileges } from '../utils/check_entity_store_privileges';
import { maintainerIdParamsSchema } from './utils/validator';
import { LIFECYCLE_ACTION } from '../../../domain/system_events';

export function registerStartMaintainer(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: `${ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_START}`,
      access: 'internal',
      summary: 'Start entity maintainer',
      description: 'Start a registered entity maintainer task by its identifier.',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: {
            params: buildStrictRouteValidationWithZod(maintainerIdParamsSchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManagerClient, entityMaintainersClient, systemEventsWriter } =
          entityStoreCtx;
        const { id } = req.params;

        logger.debug(`Start maintainer API invoked for id: ${id}`);

        const forbidden = await enforceEntityStorePrivileges(assetManagerClient, req, res);
        if (forbidden) return forbidden;

        const event = {
          action: LIFECYCLE_ACTION.maintainerStart,
          trigger: 'user',
          maintainerId: id,
        } as const;
        try {
          await entityMaintainersClient.start(id, req);
        } catch (error) {
          await systemEventsWriter.writeLifecycle({ ...event, outcome: 'failure', error });
          throw error;
        }
        await systemEventsWriter.writeLifecycle({ ...event, outcome: 'success' });

        return res.ok({ body: { ok: true } });
      })
    );
}

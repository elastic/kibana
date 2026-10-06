/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityStoreNotInstalledError } from '../../domain/errors';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';

const bodySchema = z.object({
  clearHistorySnapshots: z
    .boolean()
    .default(false)
    .describe(
      'When `true`, deletes existing history snapshot indices for this space in the background after the task is disabled. The response returns immediately and does not wait for deletion to finish. Deletion failures are logged and are not returned to the caller. If the task is already disabled, the request succeeds and does not delete indices. Defaults to `false`.'
    ),
});

export function registerDisableHistorySnapshot(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.DISABLE_HISTORY_SNAPSHOT,
      access: 'public',
      summary: 'Disable the history snapshot task',
      description:
        'Disable the Entity Store history snapshot task for this space so it no longer creates snapshot indices. Existing snapshot indices remain unless you set `clearHistorySnapshots` to `true`. Returns 404 if the Entity Store is not installed in the current space.',
      options: {
        tags: ['oas-tag:Security entity store'],
        availability: { stability: 'stable', since: '9.6.0' },
      },
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/entity_store_disable_history_snapshot.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, historySnapshotClient } = entityStoreCtx;

        logger.debug('Disable history snapshot API invoked');

        try {
          await historySnapshotClient.disable(req, {
            clearHistorySnapshots: req.body.clearHistorySnapshots,
          });
        } catch (error) {
          if (error instanceof EntityStoreNotInstalledError) {
            return res.notFound({ body: error });
          }
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return res.notFound({ body: { message: 'Entity store is not installed' } });
          }
          logger.error(error);
          return res.customError({ statusCode: 500, body: { message: error.message } });
        }

        return res.ok({ body: { ok: true } });
      })
    );
}

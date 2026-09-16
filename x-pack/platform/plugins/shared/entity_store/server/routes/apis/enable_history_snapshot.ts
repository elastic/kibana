/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityStoreNotInstalledError } from '../../domain/errors';

export function registerEnableHistorySnapshot(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.ENABLE_HISTORY_SNAPSHOT,
      access: 'public',
      summary: 'Enable history snapshot task',
      description: 'Enables and runs the Entity Store history scheduled snapshot task.',
      options: {
        tags: ['oas-tag:Security entity store'],
        availability: { since: '9.6.0' },
      },
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/entity_store_enable_history_snapshot.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, historySnapshotClient } = entityStoreCtx;

        logger.debug('Enable history snapshot API invoked');

        try {
          await historySnapshotClient.enable(req);
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

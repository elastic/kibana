/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { LogExtractionUpdateSchema } from './utils/log_extraction_validator';
import { HistorySnapshotConfigSchema } from './utils/history_snapshot_validator';
import { enforceEntityStorePrivileges } from './utils/check_entity_store_privileges';
import { MAX_EXCLUDED_USER_NAMES } from '../../domain/saved_objects';

const hasHistorySnapshotUpdate = (
  historySnapshot: { frequency?: string; retentionDays?: number } | undefined
): boolean => historySnapshot?.frequency != null || historySnapshot?.retentionDays != null;

export const UpdateBodySchema = z
  .object({
    logExtraction: LogExtractionUpdateSchema.optional(),
    excludedUserNames: z.array(z.string()).max(MAX_EXCLUDED_USER_NAMES).optional(),
    historySnapshot: HistorySnapshotConfigSchema.optional().refine(
      (value) => value === undefined || hasHistorySnapshotUpdate(value),
      { message: 'frequency or retentionDays is required' }
    ),
  })
  .refine(
    (body) =>
      body.logExtraction !== undefined ||
      body.excludedUserNames !== undefined ||
      hasHistorySnapshotUpdate(body.historySnapshot),
    { message: 'logExtraction, excludedUserNames or historySnapshot is required' }
  );

export function registerUpdate(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.UPDATE,
      access: 'public',
      summary: 'Update the Entity Store',
      description:
        'Update the Entity Store configuration without reinstalling. ' +
        'Send `logExtraction` to change log extraction settings. Omitting a log extraction field leaves it unchanged. Sending `null` for a log extraction field clears that override and reverts to the default. ' +
        'Send `historySnapshot.frequency` to change the snapshot interval (at least 1 hour) and `historySnapshot.retentionDays` to change how long snapshots are kept. Omitting either history snapshot field leaves it unchanged. ' +
        'At least one of `logExtraction` or `historySnapshot` is required.',
      options: {
        tags: ['oas-tag:Security entity store'],
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
            body: buildStrictRouteValidationWithZod(UpdateBodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_update.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const {
          logsExtractionClient,
          historySnapshotClient,
          assetManagerClient: assetManager,
          logger,
        } = await ctx.entityStore;
        logger.debug('Update api called');

        const { logExtraction, excludedUserNames, historySnapshot } = req.body;

        const forbidden = await enforceEntityStorePrivileges(
          assetManager,
          req,
          res,
          logExtraction?.additionalIndexPatterns ?? undefined
        );
        if (forbidden) return forbidden;

        try {
          if (logExtraction || excludedUserNames !== undefined) {
            await logsExtractionClient.updateConfig(logExtraction, excludedUserNames);
          }
          if (hasHistorySnapshotUpdate(historySnapshot)) {
            await historySnapshotClient.updateConfig(req, historySnapshot ?? {});
          }
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return res.notFound({ body: { message: 'Entity store is not installed' } });
          }
          logger.error(error);
          throw error;
        }

        return res.ok({
          body: {
            ok: true,
          },
        });
      })
    );
}

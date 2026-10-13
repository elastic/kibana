/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import {
  EntityType,
  ExtractionMode,
  EXTRACTION_MODE,
} from '../../../common/domain/definitions/entity_schema';
import {
  hasPriorityExtractionGate,
  resolveExtractionMode,
} from '../../../common/domain/definitions/registry';

const ALL_PROCESSES = 'all';

const paramsSchema = lazySchema(() =>
  z.object({
    entityType: EntityType,
  })
);

const bodySchema = lazySchema(() =>
  z.object({
    fromDateISO: z.string().datetime(),
    toDateISO: z.string().datetime(),
    /**
     * Which extraction process to run as. Defaults to the one this deployment actually runs.
     * `all` runs priority and non-priority at the same time, the way their tasks overlap.
     */
    process: z.union([ExtractionMode, z.literal(ALL_PROCESSES)]).optional(),
  })
);

export function registerForceLogExtraction(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION,
      access: 'internal',
      summary: 'Force log extraction',
      description:
        'Trigger an immediate log extraction run for the specified entity type and date range.',
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
            params: buildStrictRouteValidationWithZod(paramsSchema),
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger: baseLogger, logsExtractionClient, isDualProcessEnabled } = entityStoreCtx;
        const { entityType } = req.params;
        const { fromDateISO, toDateISO, process } = req.body;

        const logger = baseLogger.get('forceLogExtraction').get(entityType);

        // Only gated types have the two-process split. Without this check the extraction throws
        // inside the client, which answers 200 with a failed summary and writes an extraction
        // error onto an otherwise healthy engine.
        if (
          process !== undefined &&
          process !== EXTRACTION_MODE.single &&
          !hasPriorityExtractionGate(entityType)
        ) {
          return res.badRequest({
            body: {
              message: `Entity type ${entityType} only runs the single extraction process`,
            },
          });
        }

        if (process === ALL_PROCESSES) {
          logger.debug(`Force log extraction API called for entity type ${entityType} as all`);
          const extract = (mode: ExtractionMode) =>
            logsExtractionClient
              .withExtractionMode(mode)
              .extractLogs(entityType, { specificWindow: { fromDateISO, toDateISO } });
          const [priority, nonPriority] = await Promise.all([
            extract(EXTRACTION_MODE.priority),
            extract(EXTRACTION_MODE.nonPriority),
          ]);
          return res.ok({ body: { priority, nonPriority } });
        }

        // Without an explicit process, run as whichever mode this deployment actually uses:
        // `single` with the dual-process flag off, `priority` with it on.
        const extractionMode =
          process ?? resolveExtractionMode(await isDualProcessEnabled(), entityType);
        logger.debug(
          `Force log extraction API called for entity type ${entityType} as ${extractionMode}`
        );

        const summary = await logsExtractionClient
          .withExtractionMode(extractionMode)
          .extractLogs(entityType, {
            specificWindow: { fromDateISO, toDateISO },
          });

        return res.ok({
          body: summary,
        });
      })
    );
}

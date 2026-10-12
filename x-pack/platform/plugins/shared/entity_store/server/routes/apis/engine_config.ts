/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter, EntityStoreRequestHandlerContext } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { validateLogExtractionParams } from './utils/log_extraction_validator';
import { hasPriorityExtractionGate } from '../../../common/domain/definitions/registry';
import { enforceEntityStorePrivileges } from './utils/check_entity_store_privileges';
import { EntityType } from '../../../common/domain/definitions/entity_schema';
import {
  LogExtractionTypeOverride,
  NonPriorityLogExtractionTypeOverride,
} from '../../domain/saved_objects';

const paramsSchema = z.object({
  entityType: EntityType,
});

const bodySchema = z.object({
  /** Layer 5: reaches both processes, minus the fields only the non-priority layer may set. */
  logExtraction: LogExtractionTypeOverride.superRefine(validateLogExtractionParams).optional(),
  /** Layer 6: non-priority process only. */
  nonPriorityOverride: NonPriorityLogExtractionTypeOverride.superRefine(
    validateLogExtractionParams
  ).optional(),
});

type EngineConfigRequestParams = z.infer<typeof paramsSchema>;
type EngineConfigRequestBody = z.infer<typeof bodySchema>;

export async function handleEngineConfig(
  ctx: EntityStoreRequestHandlerContext,
  req: KibanaRequest<EngineConfigRequestParams, unknown, EngineConfigRequestBody>,
  res: KibanaResponseFactory
): Promise<IKibanaResponse> {
  const {
    logger: baseLogger,
    assetManagerClient: assetManager,
    logsExtractionClient,
    isDualProcessEnabled,
  } = await ctx.entityStore;
  const { entityType } = req.params;
  const { logExtraction, nonPriorityOverride } = req.body;

  const logger = baseLogger.get('engineConfig').get(entityType);
  logger.debug('Engine config API called');

  // `logExtraction` (layer 5) is read in every extraction mode, so the route is served
  // regardless of the flag. `nonPriorityOverride` (layer 6) is only read by the non-priority
  // process, which never runs with the flag off - accepting it would store a value that
  // silently does nothing.
  if (nonPriorityOverride && !(await isDualProcessEnabled())) {
    return res.badRequest({
      body: {
        message: 'nonPriorityOverride requires dual-process log extraction to be enabled',
      },
    });
  }

  // Same reasoning for types that have no non-priority process at all: nothing would ever read it.
  if (nonPriorityOverride && !hasPriorityExtractionGate(entityType)) {
    return res.badRequest({
      body: {
        message: `Entity type ${entityType} has no non-priority extraction process`,
      },
    });
  }

  // Only `logExtraction` carries index patterns - NonPriorityLogExtractionTypeOverride has none.
  const forbidden = await enforceEntityStorePrivileges(
    assetManager,
    req,
    res,
    logExtraction?.additionalIndexPatterns ?? undefined
  );
  if (forbidden) return forbidden;

  try {
    const config = await logsExtractionClient.updateTypeConfig(entityType, {
      logExtraction,
      nonPriorityOverride,
    });

    return res.ok({ body: config });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return res.notFound({
        body: { message: `No entity engine installed for entity type ${entityType}` },
      });
    }
    logger.error(error);
    throw error;
  }
}

export function registerEngineConfig(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.internal.ENGINE_CONFIG,
      access: 'internal',
      summary: 'Update the log extraction configuration of one entity type',
      description:
        'Set per entity-type log extraction overrides. `logExtraction` applies to both extraction ' +
        'processes, except the volume and throughput fields (`maxLogsPerPage`, ' +
        '`maxTimeWindowSize`, `maxLogsPerWindow`, `maxLogsPerWindowCapBehavior`, `docsLimit`), ' +
        'which the non-priority process ignores. Set those for the non-priority process with ' +
        '`nonPriorityOverride`, which requires dual-process log extraction to be enabled. ' +
        'Omitting a field leaves it unchanged. Sending `null` clears it and falls back to the layer below.',
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
      wrapMiddlewares(handleEngineConfig)
    );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter, EntityStoreRequestHandlerContext } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { ALL_ENTITY_TYPES, EntityType } from '../../../common/domain/definitions/entity_schema';
import { ENGINE_STATUS } from '../../domain/constants';
import type { EngineStatus } from '../../domain/saved_objects';
import { pairedQualifies } from './utils/process_status';

const bodySchema = z.object({
  entityTypes: z
    .array(EntityType)
    .optional()
    .default(ALL_ENTITY_TYPES)
    .describe('Entity types to stop. Defaults to all running types.'),
});

type StopRequestBody = z.infer<typeof bodySchema>;

const isStarted = (status: EngineStatus | null | undefined) => status === ENGINE_STATUS.STARTED;

export async function handleStop(
  ctx: EntityStoreRequestHandlerContext,
  req: KibanaRequest<unknown, unknown, StopRequestBody>,
  res: KibanaResponseFactory
): Promise<IKibanaResponse> {
  const {
    logger,
    assetManagerClient: assetManager,
    entityMaintainersClient,
    isDualProcessEnabled,
  } = await ctx.entityStore;
  const { entityTypes } = req.body;

  logger.debug('Stop API invoked');

  const [{ engines }, dualProcess] = await Promise.all([
    assetManager.getStatus(),
    isDualProcessEnabled(),
  ]);
  // `assetManager.stop` removes every process a type runs, so a type qualifies when any one of
  // them is running. Reading `status` alone would report success while a `user` engine kept
  // extracting through a non-priority process the internal route left started.
  const startedTypes = new Set(
    engines
      .filter((engine) => pairedQualifies(engine, isStarted, dualProcess))
      .map(({ type }) => type)
  );
  const toStop = entityTypes.filter((type) => startedTypes.has(type));

  await Promise.all(toStop.map((type) => assetManager.stop(type)));

  if (toStop.length > 0) {
    const { engines: remainingEngines } = await assetManager.getStatus();
    const anyStarted = remainingEngines.some((engine) =>
      pairedQualifies(engine, isStarted, dualProcess)
    );
    if (!anyStarted) {
      await entityMaintainersClient.stopAll(req);
    }
  }

  return res.ok({ body: { ok: true } });
}

export function registerStop(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.STOP,
      access: 'public',
      summary: 'Stop Entity Store engines',
      description:
        'Stop running entity engines, pausing data processing for the specified entity types.',
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
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_stop.yaml'),
        },
      },
      wrapMiddlewares(handleStop)
    );
}

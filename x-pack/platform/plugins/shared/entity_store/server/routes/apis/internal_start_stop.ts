/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter, EntityStoreRequestHandlerContext } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { dualProcessEnabledMiddleware } from '../middleware/dual_process_enabled';
import { ALL_ENTITY_TYPES, EntityType } from '../../../common/domain/definitions/entity_schema';
import { EXTRACTION_MODE } from '../../../common/domain/definitions/entity_schema';
import { hasPriorityExtractionGate } from '../../../common/domain/definitions/registry';
import { ENGINE_STATUS } from '../../domain/constants';
import type { EngineDescriptor, EngineStatus } from '../../domain/saved_objects';
import { pairedQualifies } from './utils/process_status';

/** `both` reproduces the public start/stop behaviour; the other two toggle a single task. */
const ProcessParam = z.enum(['priority', 'nonPriority', 'both']).default('both');

const bodySchema = z.object({
  entityTypes: z
    .array(EntityType)
    .max(ALL_ENTITY_TYPES.length)
    .optional()
    .describe('Entity types to act on. Defaults to every type the process applies to.'),
  process: ProcessParam.describe(
    'Which extraction process to act on. Defaults to both, matching the public start/stop APIs.'
  ),
});

type StartStopRequestBody = z.infer<typeof bodySchema>;
type Process = z.infer<typeof ProcessParam>;
type SingleProcess = Exclude<Process, 'both'>;

/**
 * The two processes track their state in separate descriptor fields, so which one decides
 * whether a type needs acting on depends on the requested process.
 */
const statusFor = (engine: EngineDescriptor, process: SingleProcess) =>
  process === EXTRACTION_MODE.nonPriority ? engine.nonPriorityStatus : engine.status;

/**
 * A process is worth stopping when it is running, and also when it is in ERROR: `stopProcess`
 * and `stop` write ERROR when task removal failed, which can leave the task scheduled. Skipping
 * ERROR would make the retry report success without touching anything.
 */
const needsStop = (status: EngineStatus | null | undefined): boolean =>
  status === ENGINE_STATUS.STARTED || status === ENGINE_STATUS.ERROR;

/** Anything not already running is worth starting, ERROR from a failed attempt included. */
const needsStart = (status: EngineStatus | null | undefined): boolean =>
  status !== ENGINE_STATUS.STARTED;

/**
 * Resolves the types to act on. An explicit list is taken as-is so an impossible request is
 * reported rather than silently narrowed; an omitted list expands to the types the requested
 * process actually runs on, which for `nonPriority` is only the gated ones.
 */
const resolveEntityTypes = (
  entityTypes: EntityType[] | undefined,
  process: Process
): EntityType[] => {
  if (entityTypes !== undefined) return [...new Set(entityTypes)];
  return process === EXTRACTION_MODE.nonPriority
    ? ALL_ENTITY_TYPES.filter(hasPriorityExtractionGate)
    : [...ALL_ENTITY_TYPES];
};

/** Types that have a non-priority variant at all. Others only ever run one process. */
const rejectUngatedTypes = (
  entityTypes: EntityType[],
  process: Process,
  res: KibanaResponseFactory
): IKibanaResponse | null => {
  if (process !== EXTRACTION_MODE.nonPriority) return null;

  const ungated = entityTypes.filter((type) => !hasPriorityExtractionGate(type));
  if (ungated.length === 0) return null;

  return res.badRequest({
    body: {
      message: `Entity types without a non-priority extraction process: ${ungated.join(', ')}`,
    },
  });
};

export async function handleInternalStart(
  ctx: EntityStoreRequestHandlerContext,
  req: KibanaRequest<unknown, unknown, StartStopRequestBody>,
  res: KibanaResponseFactory
): Promise<IKibanaResponse> {
  const {
    logger,
    assetManagerClient: assetManager,
    entityMaintainersClient,
  } = await ctx.entityStore;
  const { process } = req.body;
  const entityTypes = resolveEntityTypes(req.body.entityTypes, process);

  logger.debug(`Internal start API invoked for process: ${process}`);

  const invalid = rejectUngatedTypes(entityTypes, process, res);
  if (invalid) return invalid;

  const { engines } = await assetManager.getStatus();
  const installed = new Map(engines.map((engine) => [engine.type, engine]));

  if (process === 'both') {
    // Either process needing a start is enough: the two can diverge once the single-process
    // routes have been used, and `both` has to end with both running.
    const toStart = entityTypes.filter((type) => {
      const engine = installed.get(type);
      // `dualProcessEnabledMiddleware` already 404s this route when the flag is off, so the
      // non-priority process is always live by the time the handler runs.
      return engine !== undefined && pairedQualifies(engine, needsStart, true);
    });
    await Promise.all(toStart.map((type) => assetManager.start(req, type)));
    if (toStart.length > 0) {
      await entityMaintainersClient.startAll(req);
    }
    return res.ok({ body: { ok: true, started: toStart } });
  }

  const toStart = entityTypes.filter((type) => {
    const engine = installed.get(type);
    return engine !== undefined && needsStart(statusFor(engine, process));
  });
  await Promise.all(toStart.map((type) => assetManager.startProcess(req, type, process)));

  return res.ok({ body: { ok: true, started: toStart } });
}

export async function handleInternalStop(
  ctx: EntityStoreRequestHandlerContext,
  req: KibanaRequest<unknown, unknown, StartStopRequestBody>,
  res: KibanaResponseFactory
): Promise<IKibanaResponse> {
  const {
    logger,
    assetManagerClient: assetManager,
    entityMaintainersClient,
  } = await ctx.entityStore;
  const { process } = req.body;
  const entityTypes = resolveEntityTypes(req.body.entityTypes, process);

  logger.debug(`Internal stop API invoked for process: ${process}`);

  const invalid = rejectUngatedTypes(entityTypes, process, res);
  if (invalid) return invalid;

  const { engines } = await assetManager.getStatus();
  const installed = new Map(engines.map((engine) => [engine.type, engine]));

  if (process === 'both') {
    // Either process needing a stop is enough, otherwise stopping priority on its own first
    // would make `both` skip the type and leave non-priority extraction running.
    const toStop = entityTypes.filter((type) => {
      const engine = installed.get(type);
      // Same as the start branch: the route is not served with the flag off.
      return engine !== undefined && pairedQualifies(engine, needsStop, true);
    });
    await Promise.all(toStop.map((type) => assetManager.stop(type)));
    if (toStop.length > 0) {
      const { engines: remaining } = await assetManager.getStatus();
      // Any process still extracting keeps the maintainers up. Reading the shared status alone
      // would tear them down while a non-priority process the single-process routes left
      // started is still running.
      const anyStarted = remaining.some((engine) =>
        pairedQualifies(engine, (status) => status === ENGINE_STATUS.STARTED, true)
      );
      if (!anyStarted) {
        await entityMaintainersClient.stopAll(req);
      }
    }
    return res.ok({ body: { ok: true, stopped: toStop } });
  }

  const toStop = entityTypes.filter((type) => {
    const engine = installed.get(type);
    return engine !== undefined && needsStop(statusFor(engine, process));
  });
  await Promise.all(toStop.map((type) => assetManager.stopProcess(type, process)));

  return res.ok({ body: { ok: true, stopped: toStop } });
}

const register = (
  router: EntityStorePluginRouter,
  {
    path,
    summary,
    description,
    handler,
  }: {
    path: string;
    summary: string;
    description: string;
    handler: typeof handleInternalStart;
  }
) => {
  router.versioned
    .put({
      path,
      access: 'internal',
      summary,
      description,
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
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
      },
      wrapMiddlewares(handler, [dualProcessEnabledMiddleware])
    );
};

export function registerInternalStart(router: EntityStorePluginRouter) {
  register(router, {
    path: ENTITY_STORE_ROUTES.internal.START,
    summary: 'Start one or both Entity Store extraction processes',
    description:
      'Start the priority or non-priority extraction task for the specified entity types. ' +
      'Defaults to both, which behaves exactly like the public start API.',
    handler: handleInternalStart,
  });
}

export function registerInternalStop(router: EntityStorePluginRouter) {
  register(router, {
    path: ENTITY_STORE_ROUTES.internal.STOP,
    summary: 'Stop one or both Entity Store extraction processes',
    description:
      'Stop the priority or non-priority extraction task for the specified entity types. ' +
      'Defaults to both, which behaves exactly like the public stop API.',
    handler: handleInternalStop,
  });
}

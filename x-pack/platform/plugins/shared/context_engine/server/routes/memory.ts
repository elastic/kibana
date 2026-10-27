/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  IUiSettingsClient,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID } from '@kbn/management-settings-ids';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { isResponseError } from '@kbn/es-errors';
import {
  AI_INDEX_API_VERSION,
  AI_INDEX_INTERNAL_API_VERSION,
  MEMORY_DREAMING_DISABLE_PATH,
  MEMORY_DREAMING_ENABLE_PATH,
  MEMORY_DREAMING_PATH,
  MEMORY_DREAMING_RUN_PATH,
  MEMORY_FORGET_PATH,
  MEMORY_REMEMBER_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  ForgetMemoryResponse,
  MemoryDreamingStatusResponse,
  RememberMemoryResponse,
} from '../../common/http_api/memory';
import { DEFAULT_MEMORY_DREAMING_INTERVAL } from '../../common/memory';
import { validateMemoryDreamingInterval } from '../../common/validation';
import { MemoryAuditAction, memoryAuditEvent } from '../audit/audit_events';
import type { MemoryDreamingScheduler } from '../memory/dreaming/schedule';
import {
  MemoryConflictError,
  MemoryDisabledError,
  MemoryForbiddenError,
  MemoryNotFoundError,
  MemoryValidationError,
} from '../memory/errors';
import type { MemoryUser } from '../memory/memory_document';
import type { MemoryServiceApi } from '../memory/service';
import { formatErrorMessage } from '../utils/format_es_error';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import {
  enableMemoryDreamingBodySchema,
  forgetMemoryBodySchema,
  forgetMemoryResponseSchema,
  rememberMemoryBodySchema,
  rememberMemoryResponseSchema,
} from './schemas/memory_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const MEMORY_DISABLED_NOTE =
  'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`) or memory is turned off (`contextEngine:memoryEnabled`).';

const MEMORY_DISABLED_DESCRIPTION = 'Context Engine or its memory is turned off.';

const handleMemoryError = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  if (error instanceof MemoryValidationError) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof MemoryForbiddenError) {
    return response.forbidden({ body: { message: error.message } });
  }
  if (error instanceof MemoryNotFoundError || error instanceof MemoryDisabledError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof MemoryConflictError) {
    return response.conflict({ body: { message: error.message } });
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  const statusCode = isResponseError(error) ? error.statusCode ?? 500 : 500;
  return response.customError({ statusCode, body: { message: formatErrorMessage(error) } });
};

export const registerMemoryRoutes = ({
  router,
  logger,
  getSpaces,
  getMemoryService,
  getDreamingScheduler,
  getMemoryUser,
  isMemoryEnabled,
}: {
  router: IRouter;
  logger: Logger;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getMemoryService: (params: { request: KibanaRequest }) => Promise<MemoryServiceApi>;
  getDreamingScheduler: () => MemoryDreamingScheduler;
  getMemoryUser: (request: KibanaRequest) => Promise<MemoryUser>;
  isMemoryEnabled: (request: KibanaRequest) => Promise<boolean>;
}) => {
  const errorResponses = {
    400: { body: errorResponseSchema, description: 'The request was invalid.' },
    403: {
      body: errorResponseSchema,
      description: 'The caller cannot write Context Engine memory.',
    },
    404: { body: errorResponseSchema, description: MEMORY_DISABLED_DESCRIPTION },
  };

  router.versioned
    .post({
      path: MEMORY_REMEMBER_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Remember a memory',
      description: [
        'Writes a short-term memory in the current space, or revises one when `id` is set. The memory is visible to users and agents that can read Context Engine memory in this space.',
        MEMORY_DISABLED_NOTE,
      ].join('\n\n'),
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.6.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { body: rememberMemoryBodySchema },
          response: {
            200: { body: rememberMemoryResponseSchema, description: 'The memory was written.' },
            ...errorResponses,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = (await ctx.core).security.audit.logger;
        try {
          const memoryService = await getMemoryService({ request });
          const body: RememberMemoryResponse = await memoryService.remember(request.body);
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.REMEMBER, id: body.id }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            memoryAuditEvent({ action: MemoryAuditAction.REMEMBER, id: request.body.id, error })
          );
          return handleMemoryError(error, response, logger);
        }
      })
    );

  router.versioned
    .post({
      path: MEMORY_FORGET_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Forget a memory',
      description: [
        'Marks a short-term memory in the current space as deleted, so it is no longer recalled. Forgetting a memory twice succeeds.',
        MEMORY_DISABLED_NOTE,
      ].join('\n\n'),
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.6.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { body: forgetMemoryBodySchema },
          response: {
            200: { body: forgetMemoryResponseSchema, description: 'The memory was forgotten.' },
            ...errorResponses,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = (await ctx.core).security.audit.logger;
        const { id } = request.body;
        try {
          const memoryService = await getMemoryService({ request });
          const body: ForgetMemoryResponse = await memoryService.forget({ id });
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.FORGET, id }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.FORGET, id, error }));
          return handleMemoryError(error, response, logger);
        }
      })
    );

  const readDreamingInterval = async (uiSettings: IUiSettingsClient): Promise<string> => {
    const interval = await uiSettings.get<string>(
      CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID
    );
    return interval && validateMemoryDreamingInterval(interval) === undefined
      ? interval
      : DEFAULT_MEMORY_DREAMING_INTERVAL;
  };

  router.versioned
    .get({
      path: MEMORY_DREAMING_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get the memory dreaming status',
      description: 'Returns whether dreaming is on in the current space, and how its runs went.',
    })
    .addVersion(
      { version: AI_INDEX_INTERNAL_API_VERSION, validate: false },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          if (!(await isMemoryEnabled(request))) {
            throw new MemoryDisabledError();
          }
          const { uiSettings } = await ctx.core;
          const spaceId = resolveSpaceId(await getSpaces(), request);
          const body: MemoryDreamingStatusResponse = await getDreamingScheduler().getStatus({
            spaceId,
            interval: await readDreamingInterval(uiSettings.client),
          });
          return response.ok({ body });
        } catch (error) {
          return handleMemoryError(error, response, logger);
        }
      })
    );

  router.versioned
    .post({
      path: MEMORY_DREAMING_ENABLE_PATH,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Turn on memory dreaming',
      description:
        'Turns on dreaming in the current space, on a schedule or only from "Dream now". Dreaming calls the model as the caller, through an API key created from this request. Turning it on again replaces that key and keeps the run history.',
    })
    .addVersion(
      {
        version: AI_INDEX_INTERNAL_API_VERSION,
        validate: { request: { body: enableMemoryDreamingBodySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const { uiSettings, security } = await ctx.core;
        const auditLogger = security.audit.logger;
        try {
          if (!(await isMemoryEnabled(request))) {
            throw new MemoryDisabledError();
          }
          const spaceId = resolveSpaceId(await getSpaces(), request);
          const body: MemoryDreamingStatusResponse = await getDreamingScheduler().enable({
            request,
            spaceId,
            interval: await readDreamingInterval(uiSettings.client),
            enabledBy: await getMemoryUser(request),
            scheduled: request.body?.scheduled ?? true,
            rebuild: request.body?.rebuild ?? false,
          });
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.DREAMING_ENABLE }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.DREAMING_ENABLE, error }));
          return handleMemoryError(error, response, logger);
        }
      })
    );

  router.versioned
    .post({
      path: MEMORY_DREAMING_DISABLE_PATH,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Turn off memory dreaming',
      description:
        'Turns off dreaming in the current space. The run history is kept, so turning it on again continues where the last dream stopped.',
    })
    .addVersion(
      { version: AI_INDEX_INTERNAL_API_VERSION, validate: false },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const { uiSettings, security } = await ctx.core;
        const auditLogger = security.audit.logger;
        try {
          const spaceId = resolveSpaceId(await getSpaces(), request);
          const body: MemoryDreamingStatusResponse = await getDreamingScheduler().disable({
            spaceId,
            interval: await readDreamingInterval(uiSettings.client),
          });
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.DREAMING_DISABLE }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.DREAMING_DISABLE, error }));
          return handleMemoryError(error, response, logger);
        }
      })
    );

  router.versioned
    .post({
      path: MEMORY_DREAMING_RUN_PATH,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Run a memory dream now',
      description:
        'Starts a dream in the current space now. Dreaming must be on. Returns a 409 response when a dream is already running.',
    })
    .addVersion(
      { version: AI_INDEX_INTERNAL_API_VERSION, validate: false },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const { uiSettings, security } = await ctx.core;
        const auditLogger = security.audit.logger;
        try {
          if (!(await isMemoryEnabled(request))) {
            throw new MemoryDisabledError();
          }
          const spaceId = resolveSpaceId(await getSpaces(), request);
          const body: MemoryDreamingStatusResponse = await getDreamingScheduler().runNow({
            spaceId,
            interval: await readDreamingInterval(uiSettings.client),
          });
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.DREAMING_RUN }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(memoryAuditEvent({ action: MemoryAuditAction.DREAMING_RUN, error }));
          return handleMemoryError(error, response, logger);
        }
      })
    );
};

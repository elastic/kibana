/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import {
  AI_INDEX_API_VERSION,
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDEX_DESCRIPTION_LENGTH,
  MAX_AI_INDEX_DEST_VALUE_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDEX_SOURCES,
  MAX_AI_INDICES,
  aiIndexByIdPath,
  aiIndexPath,
} from '../../common/constants';
import type {
  CreateAiIndexResponse,
  DeleteAiIndexResponse,
  GetAiIndexResponse,
  ListAiIndexResponse,
  PutAiIndexResponse,
} from '../../common/http_api/ai_indices';
import { apiPrivileges } from '../../common/features';
import { validateAiIndexId } from '../../common/validation';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexAlreadyExistsError,
  InvalidConnectorSourceError,
} from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { validateConnectorSources } from '../ai_indices/validate_connector_sources';
import { AiIndexAuditAction, aiIndexAuditEvent } from './audit_events';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const aiIndexIdSchema = schema.string({
  minLength: 1,
  maxLength: MAX_AI_INDEX_ID_LENGTH,
  validate: validateAiIndexId,
  meta: { description: 'The unique identifier of the AI index.' },
});

const aiIndexIdParamsSchema = schema.object({
  aiIndexId: aiIndexIdSchema,
});

const aiIndexPropertiesSchema = {
  description: schema.maybe(
    schema.string({
      maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
      meta: { description: 'Human-readable description of the AI index.' },
    })
  ),
  dest: schema.object({
    type: schema.oneOf([schema.literal('data_stream'), schema.literal('index')], {
      meta: {
        description:
          'The type of the backing store. `data_stream` for a data stream, or `index` for an index or index pattern.',
      },
    }),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_DEST_VALUE_LENGTH,
      meta: {
        description:
          'The data stream or index (e.g. `ai-index-ds-foo`, `ai-index-idx-foo*`) the AI index is attached to. Must match `type` and start with `ai-index-ds-` (for `data_stream`) or `ai-index-idx-` (for `index`). System indices are not allowed.',
      },
    }),
  }),
  automations: schema.arrayOf(
    schema.object({
      type: schema.literal('workflow'),
      value: schema.string({ minLength: 0, maxLength: MAX_AI_INDEX_AUTOMATION_LENGTH }),
    }),
    {
      maxSize: MAX_AI_INDEX_AUTOMATIONS,
      meta: { description: 'Automations associated with the AI index.' },
    }
  ),
  sources: schema.arrayOf(
    schema.oneOf([
      schema.object({
        type: schema.literal('esql'),
        value: schema.string({
          minLength: 0,
          maxLength: MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
          meta: { description: 'The source value; an ES|QL query when `type` is `esql`.' },
        }),
      }),
      schema.object({
        type: schema.literal('connector'),
        value: schema.string({
          minLength: 1,
          maxLength: MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
          meta: { description: 'The source value; a connector id when `type` is `connector`.' },
        }),
      }),
    ]),
    {
      maxSize: MAX_AI_INDEX_SOURCES,
      meta: { description: 'Additional sources that provide context for the AI index.' },
    }
  ),
};

const createAiIndexBodySchema = schema.object({ id: aiIndexIdSchema, ...aiIndexPropertiesSchema });
const putAiIndexBodySchema = schema.object(aiIndexPropertiesSchema);

const withContextEngineFeatureFlag =
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
  async (ctx, request, response) => {
    const { uiSettings } = await ctx.core;
    // Registered by the agent_builder_sml plugin (server/ui_settings.ts).
    const isEnabled = await uiSettings.client.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound();
    }
    return handler(ctx, request, response);
  };

const handleAiIndexError = (error: unknown, response: KibanaResponseFactory) => {
  if (error instanceof InvalidAiIndexDestError || error instanceof InvalidConnectorSourceError) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof AiIndexNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (
    error instanceof AiIndexManagedError ||
    error instanceof AiIndexConflictError ||
    error instanceof AiIndexAlreadyExistsError
  ) {
    return response.conflict({ body: { message: error.message } });
  }
  throw error;
};

export const registerAiIndexRoutes = ({
  router,
  getAiIndexService,
  getActions,
  security,
}: {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  getActions: () => Promise<ActionsPluginStart>;
  security?: SecurityPluginSetup;
}) => {
  // Create an AI index
  router.versioned
    .post({
      path: aiIndexPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Create an AI index',
      description:
        'Creates an AI index record attached to a data stream or index pattern. Fails with a 409 if an AI index with the same id already exists.',
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: {
            body: createAiIndexBodySchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          const { id, ...properties } = request.body;
          await validateConnectorSources({
            sources: properties.sources,
            actions: await getActions(),
            request,
          });
          await getAiIndexService().create(id, properties);
          const body: CreateAiIndexResponse = { status: 'created' };
          return response.created({ body });
        } catch (error) {
          return handleAiIndexError(error, response);
        }
      })
    );

  // Create or update an AI index
  router.versioned
    .put({
      path: aiIndexByIdPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Create or update an AI index',
      description:
        'Creates or updates an AI index record attached to a data stream or index pattern.',
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
            body: putAiIndexBodySchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = security?.audit.asScoped(request);
        const { aiIndexId } = request.params;
        try {
          await validateConnectorSources({
            sources: request.body.sources,
            actions: await getActions(),
            request,
          });
          const status = await getAiIndexService().put(aiIndexId, request.body);
          auditLogger?.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.CREATE_OR_UPDATE, id: aiIndexId })
          );
          const body: PutAiIndexResponse = { status };
          return status === 'created' ? response.created({ body }) : response.ok({ body });
        } catch (error) {
          auditLogger?.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.CREATE_OR_UPDATE, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response);
        }
      })
    );

  // Get an AI index by id
  router.versioned
    .get({
      path: aiIndexByIdPath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Get an AI index',
      description: 'Fetches an AI index by id.',
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = security?.audit.asScoped(request);
        const { aiIndexId } = request.params;
        try {
          const body: GetAiIndexResponse = await getAiIndexService().get(aiIndexId);
          auditLogger?.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId, outcome: 'success' })
          );
          return response.ok({ body });
        } catch (error) {
          auditLogger?.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response);
        }
      })
    );

  // List AI indices
  router.versioned
    .get({
      path: aiIndexPath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'List AI indices',
      description: `Lists registered AI indices, up to a limit of ${MAX_AI_INDICES}.`,
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: false,
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = security?.audit.asScoped(request);
        try {
          const body: ListAiIndexResponse = {
            ai_indices: await getAiIndexService().list(),
          };
          auditLogger?.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.LIST, outcome: 'success' })
          );
          return response.ok({ body });
        } catch (error) {
          auditLogger?.log(aiIndexAuditEvent({ action: AiIndexAuditAction.LIST, error }));
          return handleAiIndexError(error, response);
        }
      })
    );

  // Delete an AI index
  router.versioned
    .delete({
      path: aiIndexByIdPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Delete an AI index',
      description:
        'Deletes an AI index by id. Only the AI index entry is deleted — backing indices are left untouched and must be removed with the Delete index API if desired.',
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = security?.audit.asScoped(request);
        const { aiIndexId } = request.params;
        try {
          await getAiIndexService().delete(aiIndexId);
          auditLogger?.log(aiIndexAuditEvent({ action: AiIndexAuditAction.DELETE, id: aiIndexId }));
          const body: DeleteAiIndexResponse = { acknowledged: true };
          return response.ok({ body });
        } catch (error) {
          auditLogger?.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.DELETE, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response);
        }
      })
    );
};

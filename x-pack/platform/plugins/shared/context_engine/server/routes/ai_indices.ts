/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import {
  AI_INDEX_API_VERSION,
  AI_INDEX_INTERNAL_API_VERSION,
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDEX_DESCRIPTION_LENGTH,
  MAX_AI_INDEX_DEST_VALUE_LENGTH,
  MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDEX_SOURCES,
  MAX_AI_INDICES,
  aiIndexByIdPath,
  aiIndexKiByIdPath,
  aiIndexKiListPath,
  aiIndexPath,
  DEFAULT_KI_PAGE_SIZE,
  MAX_KI_PAGE_SIZE,
  MAX_KI_TYPE_FILTER_LENGTH,
  MAX_INDEX_NAME_BYTES,
} from '../../common/constants';
import type {
  CreateAiIndexResponse,
  DeleteAiIndexResponse,
  GetAiIndexResponse,
  ListAiIndexResponse,
  PutAiIndexResponse,
} from '../../common/http_api/ai_indices';
import type { GetKiResponse, ListKisResponse } from '../../common/http_api/knowledge_indicators';
import { MAX_KI_ID_LENGTH } from '../../common/step_types/ki';
import { apiPrivileges } from '../../common/features';
import { validateAiIndexId } from '../../common/validation';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexAlreadyExistsError,
  InvalidConnectorSourceError,
  KiNotFoundError,
} from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import type { ImprovementsServiceApi } from '../improvements/service';
import { getKi } from '../ai_indices/ki_get';
import { getKis } from '../ai_indices/ki_list';
import { validateConnectorSources } from '../ai_indices/validate_connector_sources';
import { AiIndexAuditAction, aiIndexAuditEvent } from './audit_events';
import { withContextEngineFeatureFlag } from './with_feature_flag';

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

const kiIdParamsSchema = schema.object({
  aiIndexId: aiIndexIdSchema,
  kiId: schema.string({
    minLength: 1,
    maxLength: MAX_KI_ID_LENGTH,
    meta: { description: 'The document id of the Knowledge Indicator.' },
  }),
});

const aiIndexPropertiesSchema = {
  description: schema.maybe(
    schema.string({
      maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
      meta: { description: 'Human-readable description of the AI index.' },
    })
  ),
  feedback_agent_id: schema.maybe(
    schema.string({
      maxLength: MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH,
      meta: {
        description: 'Agent Builder agent id that runs this index’s feedback-loop analysis.',
      },
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

const listKisQuerySchema = schema.object({
  size: schema.number({
    min: 0,
    max: MAX_KI_PAGE_SIZE,
    defaultValue: DEFAULT_KI_PAGE_SIZE,
  }),
  type: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_KI_TYPE_FILTER_LENGTH,
      meta: { description: 'When set, return only KIs of this type.' },
    })
  ),
});

const getKiQuerySchema = schema.object({
  index: schema.string({
    minLength: 1,
    maxLength: MAX_INDEX_NAME_BYTES,
    meta: { description: 'The Elasticsearch index that stores the Knowledge Indicator.' },
  }),
});

const handleAiIndexError = (error: unknown, response: KibanaResponseFactory) => {
  if (error instanceof InvalidAiIndexDestError || error instanceof InvalidConnectorSourceError) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof AiIndexNotFoundError || error instanceof KiNotFoundError) {
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
  getImprovementsService,
  getActions,
}: {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  getImprovementsService: () => ImprovementsServiceApi;
  getActions: () => Promise<ActionsPluginStart>;
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
        const auditLogger = (await ctx.core).security.audit.logger;
        const { id, ...properties } = request.body;
        try {
          await validateConnectorSources({
            sources: properties.sources,
            actions: await getActions(),
            request,
          });
          await getAiIndexService().create(id, properties);
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.CREATE, id }));
          const body: CreateAiIndexResponse = { status: 'created' };
          return response.created({ body });
        } catch (error) {
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.CREATE, id, error }));
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
        const auditLogger = (await ctx.core).security.audit.logger;
        const { aiIndexId } = request.params;
        try {
          await validateConnectorSources({
            sources: request.body.sources,
            actions: await getActions(),
            request,
          });
          const status = await getAiIndexService().put(aiIndexId, request.body);
          const putAction =
            status === 'created' ? AiIndexAuditAction.CREATE : AiIndexAuditAction.UPDATE;
          auditLogger.log(aiIndexAuditEvent({ action: putAction, id: aiIndexId }));
          const body: PutAiIndexResponse = { status };
          return status === 'created' ? response.created({ body }) : response.ok({ body });
        } catch (error) {
          auditLogger.log(
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
        const auditLogger = (await ctx.core).security.audit.logger;
        const { aiIndexId } = request.params;
        try {
          const body: GetAiIndexResponse = await getAiIndexService().get(aiIndexId);
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
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
      withContextEngineFeatureFlag(async (ctx, _request, response) => {
        const auditLogger = (await ctx.core).security.audit.logger;
        try {
          const body: ListAiIndexResponse = {
            ai_indices: await getAiIndexService().list(),
          };
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.LIST }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.LIST, error }));
          return handleAiIndexError(error, response);
        }
      })
    );

  // List Knowledge Indicators for an AI index
  router.versioned
    .get({
      path: aiIndexKiListPath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'List Knowledge Indicators',
      description:
        'Returns a paginated list of Knowledge Indicators stored in the AI index destination backing store.',
    })
    .addVersion(
      {
        version: AI_INDEX_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
            query: listKisQuerySchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = (await ctx.core).security.audit.logger;
        const { aiIndexId } = request.params;
        const { size, type } = request.query;
        try {
          const aiIndex = await getAiIndexService().get(aiIndexId);
          const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
          const body: ListKisResponse = await getKis(esClient, {
            destValue: aiIndex.dest.value,
            size,
            ...(type !== undefined ? { type } : {}),
          });
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.LIST, id: aiIndexId }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.LIST, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response);
        }
      })
    );

  router.versioned
    .get({
      path: aiIndexKiByIdPath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get a Knowledge Indicator',
      description:
        'Returns the stored Knowledge Indicator document from the Elasticsearch index that stores it.',
    })
    .addVersion(
      {
        version: AI_INDEX_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: kiIdParamsSchema,
            query: getKiQuerySchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = (await ctx.core).security.audit.logger;
        const { aiIndexId, kiId } = request.params;
        const { index } = request.query;
        try {
          const aiIndex = await getAiIndexService().get(aiIndexId);
          const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
          const body: GetKiResponse = await getKi(esClient, {
            aiIndexId,
            destValue: aiIndex.dest.value,
            index,
            kiId,
          });
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId, error })
          );
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
        const auditLogger = (await ctx.core).security.audit.logger;
        const { aiIndexId } = request.params;
        try {
          await getAiIndexService().delete(aiIndexId);
          // The improvements store is keyed by AI index id, so revisions left behind would
          // resurface if an AI index were later recreated under the same id.
          await getImprovementsService().deleteByAiIndex(aiIndexId);
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.DELETE, id: aiIndexId }));
          const body: DeleteAiIndexResponse = { acknowledged: true };
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.DELETE, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response);
        }
      })
    );
};

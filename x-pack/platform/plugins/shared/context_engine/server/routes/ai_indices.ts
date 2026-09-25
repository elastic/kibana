/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  ElasticsearchClient,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { isResponseError } from '@kbn/es-errors';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import type { DeleteWorkflowsApi } from '../types';
import {
  AI_INDEX_API_VERSION,
  AI_INDEX_INTERNAL_API_VERSION,
  MAX_AI_INDEX_DESCRIBE_FIELDS,
  MAX_AI_INDEX_QUERY_LIMIT,
  MAX_AI_INDICES,
  AI_INDEX_BY_ID_PATH,
  AI_INDEX_DESCRIBE_PATH,
  AI_INDEX_FEEDBACK_ANALYSIS_PATH,
  AI_INDEX_KI_BY_ID_PATH,
  AI_INDEX_KI_LIST_PATH,
  AI_INDEX_PATH,
  AI_INDEX_QUERY_PATH,
} from '../../common/constants';
import type {
  CreateAiIndexResponse,
  DeleteAiIndexResponse,
  GetAiIndexResponse,
  ListAiIndexResponse,
  PutAiIndexFeedbackAnalysisResponse,
  PutAiIndexResponse,
  QueryAiIndicesResponse,
} from '../../common/http_api/ai_indices';
import type { GetKiResponse, ListKisResponse } from '../../common/http_api/knowledge_indicators';
import { apiPrivileges } from '../../common/features';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexDescribeResponseTooLargeError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexNotReadableError,
  AiIndexAlreadyExistsError,
  AiIndexIdConflictError,
  AiIndexQueryResponseTooLargeError,
  InvalidAiIndexQueryError,
  InvalidConnectorSourceError,
  InvalidEsqlSourceError,
  InvalidAiIndexTraceError,
  KiNotFoundError,
} from '../ai_indices/errors';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import type { AiIndexService } from '../ai_indices/service';
import {
  deleteAutomationResources,
  deleteBackingStoreResource,
} from '../ai_indices/delete_resources';
import type { FeedbackAnalysisScheduleService } from '../feedback_analysis/schedule';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { GetAiIndexDataReadServiceParams } from '../types';
import { getKi } from '../ai_indices/ki_get';
import { getKis } from '../ai_indices/ki_list';
import { validateConnectorSources } from '../ai_indices/validate_connector_sources';
import { validateEsqlSources } from '../ai_indices/validate_esql_sources';
import { validateTraces } from '../ai_indices/validate_traces';
import { formatErrorMessage } from '../utils/format_es_error';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { AiIndexAuditAction, aiIndexAuditEvent } from '../audit/audit_events';
import {
  aiIndexHttpItemResponseSchema,
  aiIndexIdParamsSchema,
  createAiIndexBodySchema,
  createAiIndexResponseSchema,
  deleteAiIndexQuerySchema,
  deleteAiIndexResponseSchema,
  describeAiIndexResponseSchema,
  errorResponseSchema,
  feedbackAnalysisSchema,
  getKiQuerySchema,
  kiIdParamsSchema,
  listAiIndexResponseSchema,
  listKisQuerySchema,
  putAiIndexBodySchema,
  queryAiIndicesBodySchema,
  queryAiIndicesResponseSchema,
  updateAiIndexResponseSchema,
} from './schemas/ai_indices_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const DELETE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [apiPrivileges.writeContextEngine],
    extendedPrivileges: [...WorkflowsManagementOperationPrivileges.delete],
  },
};

const CONTEXT_ENGINE_DISABLED_NOTE =
  'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`).';

const CONTEXT_ENGINE_DOCS_NOTE =
  '**For more information, refer to the [Context Engine documentation](https://www.elastic.co/docs/explore-analyze/ai-features/context-engine).**';

const CONTEXT_ENGINE_DISABLED_DESCRIPTION = 'Context Engine is turned off in this space.';

const hasWorkflowDeletePrivilege = (request: KibanaRequest): boolean =>
  WorkflowsManagementOperationPrivileges.delete.every(
    (privilege) => request.authzResult?.[privilege] === true
  );

const handleAiIndexError = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  if (
    error instanceof InvalidAiIndexDestError ||
    error instanceof InvalidConnectorSourceError ||
    error instanceof InvalidEsqlSourceError ||
    error instanceof InvalidAiIndexTraceError ||
    error instanceof AiIndexQueryResponseTooLargeError ||
    error instanceof AiIndexDescribeResponseTooLargeError ||
    error instanceof InvalidAiIndexQueryError
  ) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof AiIndexNotFoundError || error instanceof KiNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof AiIndexNotReadableError) {
    return response.forbidden({ body: { message: error.message } });
  }
  if (
    error instanceof AiIndexManagedError ||
    error instanceof AiIndexConflictError ||
    error instanceof AiIndexAlreadyExistsError ||
    error instanceof AiIndexIdConflictError
  ) {
    return response.conflict({ body: { message: error.message } });
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  const statusCode = isResponseError(error) ? error.statusCode ?? 500 : 500;
  return response.customError({
    statusCode,
    body: { message: formatErrorMessage(error) },
  });
};

/** Current-user reads: ES 4xx (bad ES|QL, missing privilege) is caller's error. */
const handleReadError = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  if (isResponseError(error)) {
    const { statusCode, message } = error;
    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      return response.customError({ statusCode, body: { message } });
    }
  }
  return handleAiIndexError(error, response, logger);
};

export const registerAiIndexRoutes = ({
  router,
  logger,
  getAiIndexService,
  getAiIndexDataReadService,
  getImprovementsService,
  getScheduleService,
  getActions,
  getAgentBuilder,
  getWorkflowsManagementApi,
  getSpaces,
}: {
  router: IRouter;
  logger: Logger;
  getAiIndexService: () => AiIndexService;
  getAiIndexDataReadService: (params: GetAiIndexDataReadServiceParams) => AiIndexDataReadServiceApi;
  getImprovementsService: (
    esClient: ElasticsearchClient,
    spaceId: string
  ) => ImprovementsServiceApi;
  getScheduleService: () => FeedbackAnalysisScheduleService;
  getActions: () => Promise<ActionsPluginStart>;
  getAgentBuilder: () => Promise<AgentBuilderPluginStart | undefined>;
  getWorkflowsManagementApi: () => Promise<DeleteWorkflowsApi | undefined>;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
}) => {
  const reconcileSchedule = async (aiIndexId: string, spaceId: string, request: KibanaRequest) => {
    try {
      const aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
      await getScheduleService().reconcile({
        aiIndexId,
        spaceId,
        ...(aiIndex.feedback_analysis ? { feedbackAnalysis: aiIndex.feedback_analysis } : {}),
        request,
      });
    } catch (error) {
      logger.warn(
        `Stored the feedback analysis configuration for AI index '${aiIndexId}', but failed to reconcile its schedule: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };
  // Create an AI Index
  router.versioned
    .post({
      path: AI_INDEX_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Create an AI Index',
      description: [
        'Creates an AI Index record attached to a data stream or index. Fails with a 409 if an AI Index with the same ID already exists.',
        CONTEXT_ENGINE_DISABLED_NOTE,
        CONTEXT_ENGINE_DOCS_NOTE,
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
          request: {
            body: createAiIndexBodySchema,
          },
          response: {
            201: {
              body: createAiIndexResponseSchema,
              description: 'The AI Index was created.',
            },
            400: {
              body: errorResponseSchema,
              description:
                'The request was invalid, for example a malformed `dest`, an invalid ES|QL source, or an unresolvable connector source or trace.',
            },
            403: {
              body: errorResponseSchema,
              description:
                'Elasticsearch denied the `index` trace lookup outright; the caller lacks index privileges for it.',
            },
            404: {
              body: errorResponseSchema,
              description: CONTEXT_ENGINE_DISABLED_DESCRIPTION,
            },
            409: {
              body: errorResponseSchema,
              description: 'An AI Index with the same ID already exists, or the write conflicted.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/ai_index_create.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const { security, elasticsearch } = await ctx.core;
        const auditLogger = security.audit.logger;
        const { id, ...properties } = request.body;
        try {
          await validateEsqlSources(properties.sources);
          await validateConnectorSources({
            sources: properties.sources,
            actions: await getActions(),
            request,
          });
          await validateTraces({
            traces: properties.traces,
            esClient: elasticsearch.client.asCurrentUser,
            agents: (await getAgentBuilder())?.agents,
            request,
          });
          const spaceId = resolveSpaceId(await getSpaces(), request);
          await getAiIndexService().create(id, spaceId, properties);
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.CREATE, id }));
          await reconcileSchedule(id, spaceId, request);
          const body: CreateAiIndexResponse = { status: 'created' };
          return response.created({ body });
        } catch (error) {
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.CREATE, id, error }));
          return handleAiIndexError(error, response, logger);
        }
      })
    );

  // Create or update an AI Index
  router.versioned
    .put({
      path: AI_INDEX_BY_ID_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Create or update an AI Index',
      description: [
        'Creates an AI Index with the given ID, or replaces an existing one. The request body replaces the whole record: omitted fields are removed, and omitted arrays become empty. A managed AI Index cannot be replaced and returns a 409.',
        CONTEXT_ENGINE_DISABLED_NOTE,
        CONTEXT_ENGINE_DOCS_NOTE,
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
          request: {
            params: aiIndexIdParamsSchema,
            body: putAiIndexBodySchema,
          },
          response: {
            200: {
              body: updateAiIndexResponseSchema,
              description: 'The AI Index was updated.',
            },
            201: {
              body: createAiIndexResponseSchema,
              description: 'The AI Index was created.',
            },
            400: {
              body: errorResponseSchema,
              description:
                'The request was invalid, for example a malformed `dest`, an invalid ES|QL source, or an unresolvable connector source or trace.',
            },
            403: {
              body: errorResponseSchema,
              description:
                'Elasticsearch denied the `index` trace lookup outright; the caller lacks index privileges for it.',
            },
            404: {
              body: errorResponseSchema,
              description: CONTEXT_ENGINE_DISABLED_DESCRIPTION,
            },
            409: {
              body: errorResponseSchema,
              description: 'The AI Index is managed and immutable, or the write conflicted.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/ai_index_put.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const { security, elasticsearch } = await ctx.core;
        const auditLogger = security.audit.logger;
        const { aiIndexId } = request.params;
        try {
          await validateEsqlSources(request.body.sources);
          await validateConnectorSources({
            sources: request.body.sources,
            actions: await getActions(),
            request,
          });
          await validateTraces({
            traces: request.body.traces,
            esClient: elasticsearch.client.asCurrentUser,
            agents: (await getAgentBuilder())?.agents,
            request,
          });
          const spaceId = resolveSpaceId(await getSpaces(), request);
          const status = await getAiIndexService().put(aiIndexId, spaceId, request.body);
          const putAction =
            status === 'created' ? AiIndexAuditAction.CREATE : AiIndexAuditAction.UPDATE;
          auditLogger.log(aiIndexAuditEvent({ action: putAction, id: aiIndexId }));
          await reconcileSchedule(aiIndexId, spaceId, request);
          const body: PutAiIndexResponse = { status };
          return status === 'created' ? response.created({ body }) : response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.CREATE_OR_UPDATE, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response, logger);
        }
      })
    );

  // Get an AI Index by id
  router.versioned
    .get({
      path: AI_INDEX_BY_ID_PATH,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Get an AI Index',
      description: [
        'Fetches an AI Index by ID from the current space, including the ES|QL query derived from each trace.',
        CONTEXT_ENGINE_DISABLED_NOTE,
        CONTEXT_ENGINE_DOCS_NOTE,
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
          request: {
            params: aiIndexIdParamsSchema,
          },
          response: {
            200: {
              body: aiIndexHttpItemResponseSchema,
              description: 'The requested AI Index.',
            },
            404: {
              body: errorResponseSchema,
              description:
                'No AI Index with the given ID exists in the current space, or Context Engine is turned off in this space.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/ai_index_get.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = (await ctx.core).security.audit.logger;
        const { aiIndexId } = request.params;
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const body: GetAiIndexResponse = await getAiIndexService().get(aiIndexId, spaceId);
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response, logger);
        }
      })
    );

  // List AI Indices
  router.versioned
    .get({
      path: AI_INDEX_PATH,
      security: READ_SECURITY,
      access: 'public',
      summary: 'List AI Indices',
      description: [
        `Lists up to ${MAX_AI_INDICES} AI Indices in the current space that the caller can read. The response omits an AI Index when the caller cannot read its backing index. Empty AI Indices are still included. A caller with no read privilege on any index gets a 403 response.`,
        'The space comes from the request URL (`/s/{spaceId}/…`) or defaults to the default space. It cannot be specified in any other way.',
        CONTEXT_ENGINE_DISABLED_NOTE,
        CONTEXT_ENGINE_DOCS_NOTE,
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
          response: {
            200: {
              body: listAiIndexResponseSchema,
              description: 'The AI Indices available to the caller in the current space.',
            },
            403: {
              body: errorResponseSchema,
              description:
                'The caller has no read privilege on any index, so Elasticsearch rejected the request.',
            },
            404: {
              body: errorResponseSchema,
              description: CONTEXT_ENGINE_DISABLED_DESCRIPTION,
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/ai_index_list.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        try {
          const body: ListAiIndexResponse = {
            ai_indices: await getAiIndexDataReadService({ esClient, request }).list(),
          };
          return response.ok({ body });
        } catch (error) {
          return handleReadError(error, response, logger);
        }
      })
    );

  // Query AI Indices with ES|QL
  router.versioned
    .post({
      path: AI_INDEX_QUERY_PATH,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Query AI Indices',
      description: [
        `Runs an ES|QL query as the current user. The server applies a space filter and limits the response to at most ${MAX_AI_INDEX_QUERY_LIMIT} rows.`,
        'The query determines which indices it reads. Elasticsearch index privileges limit which indices the current user can access.',
        'The space comes from the request URL (`/s/{spaceId}/…`) or defaults to the default space. The request body cannot change the space or replace the space filter.',
        CONTEXT_ENGINE_DISABLED_NOTE,
        CONTEXT_ENGINE_DOCS_NOTE,
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
          request: {
            body: queryAiIndicesBodySchema,
          },
          response: {
            200: {
              body: queryAiIndicesResponseSchema,
              description: 'The columns and rows returned by the ES|QL query.',
            },
            400: {
              body: errorResponseSchema,
              description: 'The ES|QL query was invalid, or its response exceeded the size limit.',
            },
            403: {
              body: errorResponseSchema,
              description: 'Elasticsearch rejected the read; the caller lacks index privileges.',
            },
            404: {
              body: errorResponseSchema,
              description: CONTEXT_ENGINE_DISABLED_DESCRIPTION,
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/ai_index_query.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        try {
          const body: QueryAiIndicesResponse = await getAiIndexDataReadService({
            esClient,
            request,
          }).query(request.body);
          return response.ok({ body });
        } catch (error) {
          return handleReadError(error, response, logger);
        }
      })
    );

  // Describe an AI Index
  router.versioned
    .get({
      path: AI_INDEX_DESCRIBE_PATH,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Describe an AI Index',
      description: [
        `Returns a free-form text context block for an agent. The block describes the AI Index and its ES|QL target. It also includes up to ${MAX_AI_INDEX_DESCRIBE_FIELDS} fields exposed by the backing indices, identifies which fields are semantic, provides knowledge item type and tag counts for the current space, and includes example ES|QL queries.`,
        'The API reads data as the current user. Elasticsearch index privileges limit which indices the current user can access. A caller who cannot read the backing indices gets a 403 response.',
        'The space comes from the request URL (`/s/{spaceId}/…`) or defaults to the default space. It cannot be specified in any other way.',
        CONTEXT_ENGINE_DISABLED_NOTE,
        CONTEXT_ENGINE_DOCS_NOTE,
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
          request: {
            params: aiIndexIdParamsSchema,
          },
          response: {
            200: {
              body: describeAiIndexResponseSchema,
              description: 'A free-form text context block describing the AI Index.',
            },
            400: {
              body: errorResponseSchema,
              description: 'The description response exceeded the size limit.',
            },
            403: {
              body: errorResponseSchema,
              description:
                'The caller cannot read the backing indices. Describing an AI Index requires the `read` and `view_index_metadata` index privileges on them.',
            },
            404: {
              body: errorResponseSchema,
              description:
                'No AI Index with the given ID exists in the current space, or Context Engine is turned off in this space.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/ai_index_describe.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const { aiIndexId } = request.params;
        try {
          const body = await getAiIndexDataReadService({ esClient, request }).describe(aiIndexId);
          return response.ok({ body });
        } catch (error) {
          return handleReadError(error, response, logger);
        }
      })
    );

  // List Knowledge Indicators for an AI Index
  router.versioned
    .get({
      path: AI_INDEX_KI_LIST_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'List Knowledge Indicators',
      description:
        'Returns a paginated list of Knowledge Indicators stored in the AI Index destination backing store.',
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
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
          const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
          const body: ListKisResponse = await getKis(esClient, {
            dest: aiIndex.dest,
            size,
            ...(type !== undefined ? { type } : {}),
          });
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.LIST, id: aiIndexId }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.LIST, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response, logger);
        }
      })
    );

  router.versioned
    .get({
      path: AI_INDEX_KI_BY_ID_PATH,
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
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
          const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
          const body: GetKiResponse = await getKi(esClient, {
            aiIndexId,
            dest: aiIndex.dest,
            index,
            kiId,
          });
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.GET, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response, logger);
        }
      })
    );

  // Update the feedback analysis configuration of an AI Index
  router.versioned
    .put({
      path: AI_INDEX_FEEDBACK_ANALYSIS_PATH,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Update AI Index feedback analysis configuration',
      description:
        'Replaces the feedback analysis configuration of an AI Index without touching the rest of the entry. Permitted on managed AI Indices, whose definition is otherwise immutable.',
    })
    .addVersion(
      {
        version: AI_INDEX_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
            body: feedbackAnalysisSchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = (await ctx.core).security.audit.logger;
        const { aiIndexId } = request.params;
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const feedbackAnalysis = await getAiIndexService().setFeedbackAnalysis(
            aiIndexId,
            spaceId,
            request.body
          );
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.UPDATE, id: aiIndexId }));
          await reconcileSchedule(aiIndexId, spaceId, request);
          const body: PutAiIndexFeedbackAnalysisResponse = { feedback_analysis: feedbackAnalysis };
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.UPDATE, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response, logger);
        }
      })
    );

  // Delete an AI Index
  router.versioned
    .delete({
      path: AI_INDEX_BY_ID_PATH,
      security: DELETE_SECURITY,
      access: 'public',
      summary: 'Delete an AI Index',
      description: [
        'Deletes an AI Index by ID.',
        'By default, the API preserves the backing data stream or index, its Knowledge Indicators, and attached workflow automations. Set `delete_knowledge_indicators` to `true` to delete the backing data stream or index and its Knowledge Indicators. Set `delete_automations` to `true` to delete the attached workflow automations.',
        'The API does not delete the backing data stream or index when another AI Index uses the same destination.',
        CONTEXT_ENGINE_DISABLED_NOTE,
        CONTEXT_ENGINE_DOCS_NOTE,
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
          request: {
            params: aiIndexIdParamsSchema,
            query: deleteAiIndexQuerySchema,
          },
          response: {
            200: {
              body: deleteAiIndexResponseSchema,
              description:
                'The AI Index entry was deleted. `errors` lists any best-effort cleanup failures.',
            },
            404: {
              body: errorResponseSchema,
              description:
                'No AI Index with the given ID exists in the current space, or Context Engine is turned off in this space.',
            },
            409: {
              body: errorResponseSchema,
              description: 'The AI Index is managed and cannot be deleted.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/ai_index_delete.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const core = await ctx.core;
        const auditLogger = core.security.audit.logger;
        const { aiIndexId } = request.params;
        const spaceId = resolveSpaceId(await getSpaces(), request);
        const {
          delete_knowledge_indicators: deleteKnowledgeIndicators,
          delete_automations: deleteAutomations,
        } = request.query;
        try {
          const aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
          if (aiIndex.managed) {
            throw new AiIndexManagedError(aiIndexId);
          }
          await getAiIndexService().delete(aiIndexId, spaceId);
          // Audited here rather than after the cleanup below: the deletion is done and cannot be
          // undone, so an audit record is owed for it whatever happens next.
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.DELETE, id: aiIndexId }));

          await getScheduleService()
            .remove({ aiIndexId, spaceId })
            .catch((error) => {
              logger.warn(
                `Deleted AI index '${aiIndexId}', but failed to remove its analysis schedule: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            });

          // From here on, failures are best-effort: the AI index entry is already gone (the primary
          // goal), so any failure is reported back to the caller as a partial-failure
          const errors: string[] = [];

          if (deleteKnowledgeIndicators) {
            const err = await deleteBackingStoreResource({
              esClient: core.elasticsearch.client,
              dest: aiIndex.dest,
              logger,
              aiIndexId,
              spaceId,
            });
            if (err) errors.push(err);
          }

          if (deleteAutomations) {
            if (
              aiIndex.automations.some((automation) => automation.type === 'workflow') &&
              !hasWorkflowDeletePrivilege(request)
            ) {
              const message = 'Missing privilege to delete workflow automations.';
              logger.warn(
                `Deleted AI index '${aiIndexId}', but could not delete its automations: ${message}`
              );
              errors.push(`Failed to delete automations: ${message}`);
            } else {
              const automationErrors = await deleteAutomationResources({
                automations: aiIndex.automations,
                workflowsManagementApi: await getWorkflowsManagementApi(),
                spaceId,
                request,
                logger,
                aiIndexId,
              });
              errors.push(...automationErrors);
            }
          }

          // Log any partial failures to audit trail
          for (const err of errors) {
            auditLogger.log(
              aiIndexAuditEvent({
                action: AiIndexAuditAction.DELETE_RESOURCES,
                id: aiIndexId,
                error: new Error(err),
              })
            );
          }

          // The improvements store is keyed by AI Index id, so revisions left behind would
          // resurface if an AI Index were later recreated under the same id. Best-effort: the store
          // is a user-owned index and the caller may well have no privileges on it, and reporting a
          // failure for an index that is already gone would only send them to retry a delete that
          // now 404s. What is left behind is inert until an id is reused.
          await getImprovementsService(core.elasticsearch.client.asCurrentUser, spaceId)
            .deleteByAiIndex(aiIndexId)
            .catch((error) => {
              logger.warn(
                `Deleted AI index '${aiIndexId}', but failed to clear its improvements: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            });

          const body: DeleteAiIndexResponse = { acknowledged: true, errors };
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.DELETE, id: aiIndexId, error })
          );
          return handleAiIndexError(error, response, logger);
        }
      })
    );
};

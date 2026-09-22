/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
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
  DEFAULT_AI_INDEX_QUERY_LIMIT,
  DEFAULT_FEEDBACK_ANALYSIS_INTERVAL,
  DEFAULT_FEEDBACK_ANALYSIS_SIGNAL_TIME_RANGE_FROM,
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDEX_DESCRIBE_FIELDS,
  MAX_AI_INDEX_DESCRIPTION_LENGTH,
  MAX_AI_INDEX_DEST_VALUE_LENGTH,
  MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_QUERY_LENGTH,
  MAX_AI_INDEX_QUERY_LIMIT,
  MAX_AI_INDEX_QUERY_PARAM_KEY_LENGTH,
  MAX_AI_INDEX_QUERY_PARAM_VALUE_LENGTH,
  MAX_AI_INDEX_QUERY_PARAMS,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDEX_SOURCES,
  MAX_AI_INDEX_TRACES,
  MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS,
  MAX_AI_INDEX_TRACE_VALUE_LENGTH,
  MAX_AI_INDICES,
  MAX_FEEDBACK_ANALYSIS_INTERVAL_LENGTH,
  MAX_FEEDBACK_ANALYSIS_SIGNAL_FILTER_LENGTH,
  MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH,
  MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES,
  aiIndexByIdPath,
  aiIndexDescribePath,
  aiIndexFeedbackAnalysisPath,
  aiIndexKiByIdPath,
  aiIndexKiListPath,
  aiIndexPath,
  aiIndexQueryPath,
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
  PutAiIndexFeedbackAnalysisResponse,
  PutAiIndexResponse,
  QueryAiIndicesResponse,
} from '../../common/http_api/ai_indices';
import type { ImprovementAction } from '../../common/http_api/improvement_actions';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import type { GetKiResponse, ListKisResponse } from '../../common/http_api/knowledge_indicators';
import { MAX_KI_ID_LENGTH } from '../../common/step_types/ki';
import { apiPrivileges } from '../../common/features';
import {
  validateAbsoluteSignalWindow,
  validateAiIndexId,
  validateAiIndexQueryLimit,
  validateFeedbackAnalysisInterval,
  validateRelativeSignalWindow,
  validateSignalWindowCoversInterval,
} from '../../common/validation';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexDescribeResponseTooLargeError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexAlreadyExistsError,
  AiIndexIdConflictError,
  AiIndexQueryResponseTooLargeError,
  InvalidAiIndexQueryError,
  InvalidConnectorSourceError,
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
import { validateSignalFilter } from '../ai_indices/signal_filter';
import { validateConnectorSources } from '../ai_indices/validate_connector_sources';
import { validateTraces } from '../ai_indices/validate_traces';
import { formatErrorMessage } from '../utils/format_es_error';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { AiIndexAuditAction, aiIndexAuditEvent } from '../audit/audit_events';
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

const hasWorkflowDeletePrivilege = (request: KibanaRequest): boolean =>
  WorkflowsManagementOperationPrivileges.delete.every(
    (privilege) => request.authzResult?.[privilege] === true
  );

const aiIndexIdSchema = schema.string({
  minLength: 1,
  maxLength: MAX_AI_INDEX_ID_LENGTH,
  validate: validateAiIndexId,
  meta: { description: 'The unique identifier of the AI Index.' },
});

const aiIndexIdParamsSchema = schema.object({
  aiIndexId: aiIndexIdSchema,
});

const signalTimeRangeSchema = schema.oneOf(
  [
    schema.object({
      type: schema.literal('relative'),
      from: schema.string({
        maxLength: MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH,
        validate: validateRelativeSignalWindow,
        meta: { description: 'Date math relative to now, for example `now-30d`.' },
      }),
    }),
    schema.object({
      type: schema.literal('absolute'),
      from: schema.string({
        maxLength: MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH,
        validate: validateAbsoluteSignalWindow,
        meta: { description: 'ISO 8601 date to analyze signals since.' },
      }),
    }),
  ],
  {
    defaultValue: {
      type: 'relative' as const,
      from: DEFAULT_FEEDBACK_ANALYSIS_SIGNAL_TIME_RANGE_FROM,
    },
    meta: { description: 'Which signals the analysis reads. A read filter only.' },
  }
);

// Derived from the taxonomy rather than re-listed, so a new action cannot be
// added to the vocabulary and silently stay unconfigurable here.
const improvementActionSchema = schema.oneOf(
  IMPROVEMENT_ACTIONS.map((action) => schema.literal(action)) as [Type<ImprovementAction>]
);

const feedbackAnalysisSchema = schema.object(
  {
    enabled: schema.boolean({
      meta: {
        description:
          'Desired state of the recurring analysis. The scheduler stays authoritative for whether it is actually running.',
      },
    }),
    agent_id: schema.maybe(
      schema.string({
        maxLength: MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH,
        meta: {
          description: 'Agent Builder agent id that runs this index’s feedback-loop analysis.',
        },
      })
    ),
    schedule: schema.object(
      {
        interval: schema.string({
          maxLength: MAX_FEEDBACK_ANALYSIS_INTERVAL_LENGTH,
          validate: validateFeedbackAnalysisInterval,
          meta: {
            description: `How often to analyze, for example \`1h\` or \`24h\`. At least ${MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES} minutes.`,
          },
        }),
      },
      { defaultValue: { interval: DEFAULT_FEEDBACK_ANALYSIS_INTERVAL } }
    ),
    signal_time_range: signalTimeRangeSchema,
    signal_filter: schema.maybe(
      schema.string({
        maxLength: MAX_FEEDBACK_ANALYSIS_SIGNAL_FILTER_LENGTH,
        validate: validateSignalFilter,
        meta: {
          description:
            'KQL narrowing which signals this index analyzes, for example `tags: query_error`.',
        },
      })
    ),
    allowed_actions: schema.arrayOf(improvementActionSchema, {
      defaultValue: [...IMPROVEMENT_ACTIONS],
      maxSize: IMPROVEMENT_ACTIONS.length,
      meta: {
        description: 'Improvement actions the analysis may propose. An empty list is observe-only.',
      },
    }),
  },
  {
    validate: ({ schedule, signal_time_range: signalTimeRange }) =>
      validateSignalWindowCoversInterval(schedule.interval, signalTimeRange),
  }
);
const kiIdParamsSchema = schema.object({
  aiIndexId: aiIndexIdSchema,
  kiId: schema.string({
    minLength: 1,
    maxLength: MAX_KI_ID_LENGTH,
    meta: { description: 'The document id of the Knowledge Indicator.' },
  }),
});

const aiIndexTraceSchema = schema.oneOf([
  schema.object({
    type: schema.literal('elastic_agent'),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_TRACE_VALUE_LENGTH,
      meta: { description: 'The Agent Builder agent id.' },
    }),
  }),
  schema.object({
    type: schema.literal('index'),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_TRACE_VALUE_LENGTH,
      validate: (value) => {
        if (value.split(',').length > MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS) {
          return `value must contain at most ${MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS} comma-separated expressions`;
        }
      },
      meta: { description: 'An index or data stream name or pattern to read traces from.' },
    }),
  }),
  schema.object({
    type: schema.literal('esql'),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_TRACE_VALUE_LENGTH,
      meta: { description: 'An ES|QL query to select traces.' },
    }),
  }),
]);

const aiIndexPropertiesSchema = {
  description: schema.maybe(
    schema.string({
      maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
      meta: { description: 'Human-readable description of the AI Index.' },
    })
  ),
  feedback_analysis: schema.maybe(feedbackAnalysisSchema),
  dest: schema.object({
    type: schema.oneOf([schema.literal('data_stream'), schema.literal('index')], {
      meta: {
        description:
          'The type of the backing store. `data_stream` for a data stream, or `index` for an index.',
      },
    }),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_DEST_VALUE_LENGTH,
      meta: {
        description:
          'The data stream or index (e.g. `ai-index-ds-foo`, `ai-index-idx-foo`) the AI Index is attached to. Must name a single data stream or index (no wildcards or comma-separated lists), match `type`, and start with `ai-index-ds-` (for `data_stream`) or `ai-index-idx-` (for `index`). The rest of the value must be a valid AI index id. System indices are not allowed.',
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
      defaultValue: [],
      meta: {
        description:
          'Automations associated with the AI Index. Defaults to an empty array when omitted.',
      },
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
      defaultValue: [],
      meta: {
        description:
          'Additional sources that provide context for the AI Index. Defaults to an empty array when omitted.',
      },
    }
  ),
  traces: schema.arrayOf(aiIndexTraceSchema, {
    maxSize: MAX_AI_INDEX_TRACES,
    defaultValue: [],
    meta: {
      description:
        'Trace sources linked to this AI index. A write replaces the whole array. Defaults to an empty array when omitted.',
    },
  }),
};

const createAiIndexBodySchema = schema.object({
  id: aiIndexIdSchema,
  ...aiIndexPropertiesSchema,
});
const putAiIndexBodySchema = schema.object({
  ...aiIndexPropertiesSchema,
});

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

const queryAiIndicesBodySchema = schema.object({
  query: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_QUERY_LENGTH,
    meta: {
      description:
        'The ES|QL query to run. Its FROM decides which Elasticsearch indices are read (normally `ai-index-*`); the server adds the space filter and a row limit.',
    },
  }),
  params: schema.maybe(
    schema.recordOf(
      schema.string({ minLength: 1, maxLength: MAX_AI_INDEX_QUERY_PARAM_KEY_LENGTH }),
      schema.oneOf([
        schema.string({ maxLength: MAX_AI_INDEX_QUERY_PARAM_VALUE_LENGTH }),
        schema.number(),
        schema.boolean(),
      ]),
      {
        validate: (params) =>
          Object.keys(params).length > MAX_AI_INDEX_QUERY_PARAMS
            ? `must not have more than ${MAX_AI_INDEX_QUERY_PARAMS} entries`
            : undefined,
        meta: { description: 'Values for `?name` placeholders in the query.' },
      }
    )
  ),
  limit: schema.maybe(
    schema.number({
      min: 1,
      max: MAX_AI_INDEX_QUERY_LIMIT,
      validate: validateAiIndexQueryLimit,
      meta: {
        description: `Maximum rows to return. Defaults to ${DEFAULT_AI_INDEX_QUERY_LIMIT}; a trailing \`LIMIT\` in the query is capped to this value.`,
      },
    })
  ),
});

const handleAiIndexError = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  if (
    error instanceof InvalidAiIndexDestError ||
    error instanceof InvalidConnectorSourceError ||
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

const deleteAiIndexQuerySchema = schema.object({
  delete_knowledge_indicators: schema.boolean({
    defaultValue: false,
    meta: {
      description:
        'When true, also delete the backing data stream/index, which removes its Knowledge Indicators. Skipped when another AI index still uses the same dest. Defaults to false.',
    },
  }),
  delete_automations: schema.boolean({
    defaultValue: false,
    meta: {
      description: 'When true, also delete the attached workflow automations. Defaults to false.',
    },
  }),
});

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
      path: aiIndexPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Create an AI Index',
      description:
        'Creates an AI Index record attached to a data stream or index. Fails with a 409 if an AI Index with the same id already exists.',
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
        const { security, elasticsearch } = await ctx.core;
        const auditLogger = security.audit.logger;
        const { id, ...properties } = request.body;
        try {
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
      path: aiIndexByIdPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Create or update an AI Index',
      description: 'Creates or updates an AI Index record attached to a data stream or index.',
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
        const { security, elasticsearch } = await ctx.core;
        const auditLogger = security.audit.logger;
        const { aiIndexId } = request.params;
        try {
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
      path: aiIndexByIdPath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Get an AI Index',
      description: 'Fetches an AI Index by id.',
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
      path: aiIndexPath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'List AI Indices',
      description: `Lists the AI Indices registered in the current space that the caller can read. An AI Index is left out when the caller cannot read its backing index. An empty AI Index is still listed. Up to ${MAX_AI_INDICES} entries. The space comes from the request URL (\`/s/{spaceId}/…\`, or the default space); it cannot be set any other way.`,
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
      path: aiIndexQueryPath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Query AI Indices',
      description: `Runs an ES|QL query as the current user, with a space filter and a row limit (at most ${MAX_AI_INDEX_QUERY_LIMIT}) applied server-side. The space comes from the request URL (\`/s/{spaceId}/…\`, or the default space); nothing in the request body can change it or replace the space filter. The query decides which indices it reads; Elasticsearch index privileges bound what it can reach.`,
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
            body: queryAiIndicesBodySchema,
          },
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
      path: aiIndexDescribePath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Describe an AI Index',
      description: `Returns a free-form text context block for an agent: the AI Index, its ES|QL target, the fields its backing indices expose (at most ${MAX_AI_INDEX_DESCRIBE_FIELDS}) and which are semantic, knowledge item type and tag counts in the current space, and example ES|QL queries. Read as the current user, so Elasticsearch index privileges bound what it can reach. The space comes from the request URL (\`/s/{spaceId}/…\`, or the default space); it cannot be set any other way.`,
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
      path: aiIndexKiListPath,
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
      path: aiIndexFeedbackAnalysisPath,
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
      path: aiIndexByIdPath,
      security: DELETE_SECURITY,
      access: 'public',
      summary: 'Delete an AI Index',
      description:
        'Deletes an AI Index by id. The backing data stream/index (and therefore its Knowledge ' +
        'Indicators) and the attached workflow automations are left untouched unless the ' +
        '`delete_knowledge_indicators`/`delete_automations` query parameters are set to true. ' +
        'The dest is not deleted when another AI Index still uses it.',
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
            query: deleteAiIndexQuerySchema,
          },
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

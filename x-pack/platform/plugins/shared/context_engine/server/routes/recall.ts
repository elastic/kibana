/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  AI_INDEX_API_VERSION,
  DEFAULT_RECALL_TOKEN_BUDGET,
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_USER_ID_LENGTH,
  MAX_RECALL_INCLUDE_ENTRY_LENGTH,
  MAX_RECALL_INCLUDE_ITEMS,
  MAX_RECALL_QUERY_LENGTH,
  MAX_RECALL_SESSION_IDS,
  MAX_RECALL_TOKEN_BUDGET,
  MIN_RECALL_TOKEN_BUDGET,
  RECALL_AI_INDEX_PREFIX,
  RECALL_PATH,
} from '../../common/constants';
import type { RecallIncludeEntry, RecallSessionStore } from '../../common/http_api/recall';
import { validateNonBlank } from '../../common/validation';
import { memoryRecallAuditEvent } from '../audit/audit_events';
import {
  needsMemoryEnabled,
  parseRecallInclude,
  validateRecallIncludeEntry,
} from '../recall/include';
import type { RecallService } from '../recall/service';
import { formatEsError } from '../utils/format_es_error';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { CONTEXT_ENGINE_DOCS_NOTE } from './constants';
import { MEMORY_READ_SECURITY, resolveMemoryUser, toError } from './memory_user';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import { MEMORY_DISABLED_MESSAGE, withContextEngineFeatureFlag } from './with_feature_flag';

const recallBodySchema = schema.object({
  query: schema.boundedString({
    minLength: 1,
    maxLength: MAX_RECALL_QUERY_LENGTH,
    validate: validateNonBlank,
    meta: { description: 'The question to recall context for.' },
  }),
  user_id: schema.boundedString({
    minLength: 1,
    maxLength: MAX_MEMORY_USER_ID_LENGTH,
    validate: validateNonBlank,
    meta: {
      description:
        "Filters results to one user's memories and user-scoped context. Naming another user requires `contextEngine:manage_memory`.",
    },
  }),
  session_ids: schema.maybe(
    schema.arrayOf(
      schema.boundedString({
        minLength: 1,
        maxLength: MAX_MEMORY_ID_LENGTH,
        validate: validateNonBlank,
      }),
      {
        maxSize: MAX_RECALL_SESSION_IDS,
        meta: {
          description:
            'Narrows `session_events` and `session_memory` results to one or more sessions.',
        },
      }
    )
  ),
  include: schema.arrayOf(
    schema.boundedString({
      minLength: 1,
      maxLength: MAX_RECALL_INCLUDE_ENTRY_LENGTH,
      validate: validateRecallIncludeEntry,
    }),
    {
      minSize: 1,
      maxSize: MAX_RECALL_INCLUDE_ITEMS,
      meta: {
        description:
          'The stores to search: `session_events`, `session_memory`, `ai_index:*`, or `ai_index:<ai_index_id>`.',
      },
    }
  ),
  token_budget: schema.maybe(
    schema.number({
      min: MIN_RECALL_TOKEN_BUDGET,
      max: MAX_RECALL_TOKEN_BUDGET,
      validate: (value) => (Number.isInteger(value) ? undefined : 'must be an integer'),
      meta: {
        description: `Approximate token budget for the returned context (${MIN_RECALL_TOKEN_BUDGET} to ${MAX_RECALL_TOKEN_BUDGET}). Defaults to ${DEFAULT_RECALL_TOKEN_BUDGET}.`,
      },
    })
  ),
  format: schema.maybe(
    schema.oneOf([schema.literal('yaml'), schema.literal('json')], {
      meta: { description: 'The response shape: `yaml` (default) or `json`.' },
    })
  ),
});

const resultIdSchema = schema.string({ meta: { description: 'The result id.' } });
const sessionIdSchema = schema.string({ meta: { description: 'The session the result is from.' } });
const contentSchema = schema.string({ meta: { description: 'The recalled text.' } });

const recallResultSchema = schema.oneOf([
  schema.object(
    {
      id: resultIdSchema,
      session_id: sessionIdSchema,
      source: schema.literal('session_events'),
      date: schema.string({ meta: { description: 'When the event happened.' } }),
      role: schema.oneOf([schema.literal('user'), schema.literal('assistant')], {
        meta: { description: 'Who wrote the message.' },
      }),
      content: contentSchema,
    },
    {
      meta: {
        id: 'context_engine_recall_session_event_result',
        description: 'A recalled session event.',
      },
    }
  ),
  schema.object(
    {
      id: resultIdSchema,
      session_id: sessionIdSchema,
      source: schema.literal('session_memory'),
      date: schema.string({ meta: { description: 'When the memory was last updated.' } }),
      content: contentSchema,
      attributes: schema.maybe(
        schema.recordOf(schema.string(), schema.string(), {
          meta: { description: 'The attributes stored with the memory.' },
        })
      ),
    },
    {
      meta: {
        id: 'context_engine_recall_session_memory_result',
        description: 'A recalled session memory.',
      },
    }
  ),
  schema.object(
    {
      id: resultIdSchema,
      source: schema.string({
        validate: (value) =>
          value.startsWith(RECALL_AI_INDEX_PREFIX) ? undefined : 'must start with ai_index:',
        meta: { description: 'The AI index the result is from, as `ai_index:<ai_index_id>`.' },
      }),
      date: schema.maybe(
        schema.string({ meta: { description: 'When the document was updated.' } })
      ),
      content: contentSchema,
      attributes: schema.maybe(
        schema.recordOf(schema.string(), schema.any(), {
          meta: { description: 'Other fields of the AI index document.' },
        })
      ),
    },
    {
      meta: {
        id: 'context_engine_recall_ai_index_result',
        description: 'A recalled Knowledge Indicator from an AI index.',
      },
    }
  ),
]);

const tookMsSchema = schema.number({
  meta: { description: 'How long the recall took, in milliseconds.' },
});

const recallResponseSchema = () =>
  schema.oneOf([
    schema.object(
      {
        context: schema.string({
          meta: { description: 'The recalled context as YAML, ready to add to a prompt.' },
        }),
        took_ms: tookMsSchema,
      },
      { meta: { id: 'context_engine_recall_yaml_response' } }
    ),
    schema.object(
      {
        results: schema.arrayOf(recallResultSchema, {
          meta: { description: 'The recalled results, most relevant first.' },
        }),
        took_ms: tookMsSchema,
      },
      { meta: { id: 'context_engine_recall_json_response' } }
    ),
  ]);

const isRecallIncludeEntry = (entry: string): entry is RecallIncludeEntry =>
  entry === 'session_events' ||
  entry === 'session_memory' ||
  entry.startsWith(RECALL_AI_INDEX_PREFIX);

/** Registers the public recall route (`POST /api/context_engine/_recall`). */
export const registerRecallRoutes = ({
  router,
  getSpaces,
  getRecallService,
  isMemoryEnabled,
}: {
  router: IRouter;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getRecallService: () => Promise<RecallService>;
  isMemoryEnabled: (request: KibanaRequest) => Promise<boolean>;
}) => {
  router.versioned
    .post({
      path: RECALL_PATH,
      security: MEMORY_READ_SECURITY,
      access: 'public',
      summary: 'Recall context',
      description: [
        "Searches the stores named in `include` for context relevant to `query`: a user's session events and session memories, and AI indices. Results from all stores are reranked together, most relevant first.",
        `\`token_budget\` caps the approximate size of the returned context (defaults to ${DEFAULT_RECALL_TOKEN_BUDGET} tokens). Only whole results are returned, so the context can be smaller than the budget. \`format\` returns the context as one YAML string (\`yaml\`, the default) or as a list of results (\`json\`).`,
        'The route needs the `contextEngine:read` privilege. Naming another user in `user_id` also needs `contextEngine:manage_memory`. AI indices are searched as the caller, who needs the Elasticsearch `read` privilege on their backing indices; an AI index the caller cannot read returns no results.',
        'Each request that queries `session_events` or `session_memory` writes one `memory_recall` audit event.',
        'Returns 429 when Elasticsearch rejects the request because it is overloaded; retry with backoff.',
        'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`), or when memory is turned off (`contextEngine:memoryEnabled`) and `include` names `session_events` or `session_memory`.',
        CONTEXT_ENGINE_DOCS_NOTE,
      ].join('\n\n'),
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.7.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { body: recallBodySchema },
          response: {
            200: {
              body: recallResponseSchema,
              description: 'The recalled context, in the requested format.',
            },
            403: {
              body: errorResponseSchema,
              description:
                '`user_id` names another user and the caller lacks `contextEngine:manage_memory`.',
            },
            404: {
              body: errorResponseSchema,
              description:
                'Context Engine is turned off, or memory is turned off and `include` names a session store.',
            },
            429: {
              body: errorResponseSchema,
              description:
                'Elasticsearch rejected the request because it is overloaded; retry with backoff.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/recall.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const parsed = parseRecallInclude(request.body.include);
        if (!parsed.ok) {
          return response.badRequest({ body: { message: parsed.error } });
        }
        const memoryStores: RecallSessionStore[] = [
          ...(parsed.include.sessionEvents ? (['session_events'] as const) : []),
          ...(parsed.include.sessionMemory ? (['session_memory'] as const) : []),
        ];
        if (needsMemoryEnabled(parsed.include) && !(await isMemoryEnabled(request))) {
          return response.notFound({ body: { message: MEMORY_DISABLED_MESSAGE } });
        }

        const { security, elasticsearch, userProfile } = await ctx.core;
        const auditPreServiceFailure = (error: Error) => {
          if (memoryStores.length > 0) {
            security.audit.logger.log(
              memoryRecallAuditEvent({
                stores: memoryStores,
                targetUserId: request.body.user_id,
                error,
              })
            );
          }
        };

        const prepareRecall = async () => {
          try {
            const resolvedUser = await resolveMemoryUser({
              request,
              userProfile,
              requestedUserId: request.body.user_id,
            });
            if (!resolvedUser.ok) {
              auditPreServiceFailure(resolvedUser.error);
              return { ok: false as const, error: resolvedUser.error };
            }
            const space = resolveSpaceId(await getSpaces(), request);
            const service = await getRecallService();
            return { ok: true as const, userId: resolvedUser.userId, space, service };
          } catch (error) {
            auditPreServiceFailure(toError(error));
            throw error;
          }
        };

        const prepared = await prepareRecall();
        if (!prepared.ok) {
          return response.forbidden({ body: { message: prepared.error.message } });
        }

        try {
          const body = await prepared.service.recall(
            {
              space: prepared.space,
              callerEsClient: elasticsearch.client.asCurrentUser,
              auditLogger: security.audit.logger,
            },
            {
              ...request.body,
              user_id: prepared.userId,
              include: request.body.include.filter(isRecallIncludeEntry),
            }
          );
          return response.ok({ body });
        } catch (error) {
          if (isResponseError(error) && error.statusCode === 429) {
            return response.customError({
              statusCode: 429,
              body: { message: formatEsError(error) },
            });
          }
          throw error;
        }
      })
    );
};

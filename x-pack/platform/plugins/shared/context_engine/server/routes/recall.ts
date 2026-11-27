/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type } from '@kbn/config-schema';
import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  AI_INDEX_API_VERSION,
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
import type { RecallIncludeEntry } from '../../common/http_api/recall';
import { validateNonBlank } from '../../common/validation';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import { AiIndexThrottledError } from '../ai_indices/errors';
import { needsMemoryEnabled, validateRecallIncludeEntry } from '../recall/include';
import type { RecallService } from '../recall/service';
import type { GetAiIndexDataReadServiceParams } from '../types';
import { formatEsError } from '../utils/format_es_error';
import { CONTEXT_ENGINE_DOCS_NOTE } from './constants';
import { MEMORY_READ_SECURITY, resolveMemoryUser } from './memory_user';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import { MEMORY_DISABLED_MESSAGE, withContextEngineFeatureFlag } from './with_feature_flag';

const recallIncludeEntrySchema = schema.boundedString({
  minLength: 1,
  maxLength: MAX_RECALL_INCLUDE_ENTRY_LENGTH,
  validate: validateRecallIncludeEntry,
}) as Type<RecallIncludeEntry>;

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
  include: schema.arrayOf(recallIncludeEntrySchema, {
    minSize: 1,
    maxSize: MAX_RECALL_INCLUDE_ITEMS,
    meta: {
      description:
        'The stores to search: `session_events`, `session_memory`, `ai_index:*`, or `ai_index:<ai_index_id>`.',
    },
  }),
  token_budget: schema.maybe(
    schema.number({
      min: MIN_RECALL_TOKEN_BUDGET,
      max: MAX_RECALL_TOKEN_BUDGET,
      validate: (value) => (Number.isInteger(value) ? undefined : 'must be an integer'),
      meta: {
        description: `Approximate token budget for the returned context (${MIN_RECALL_TOKEN_BUDGET} to ${MAX_RECALL_TOKEN_BUDGET}).`,
      },
    })
  ),
  format: schema.maybe(
    schema.oneOf([schema.literal('json')], {
      meta: { description: 'The response shape. Only `json` is supported.' },
    })
  ),
});

const recallResultSchema = schema.object(
  {
    id: schema.string({ meta: { description: 'The result id.' } }),
    source: schema.string({
      validate: (value) =>
        value.startsWith(RECALL_AI_INDEX_PREFIX) ? undefined : 'must start with ai_index:',
      meta: { description: 'The AI index the result is from, as `ai_index:<ai_index_id>`.' },
    }),
    date: schema.maybe(schema.string({ meta: { description: 'When the document was updated.' } })),
    content: schema.string({ meta: { description: 'The recalled text.' } }),
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
);

const recallResponseSchema = () =>
  schema.object(
    {
      results: schema.arrayOf(recallResultSchema, {
        meta: { description: 'The recalled results, most relevant first.' },
      }),
      took_ms: schema.number({
        meta: { description: 'How long the recall took, in milliseconds.' },
      }),
    },
    { meta: { id: 'context_engine_recall_json_response' } }
  );

export const registerRecallRoutes = ({
  router,
  logger,
  getRecallService,
  getAiIndexDataReadService,
  isMemoryEnabled,
}: {
  router: IRouter;
  logger: Logger;
  getRecallService: () => Promise<RecallService>;
  getAiIndexDataReadService: (params: GetAiIndexDataReadServiceParams) => AiIndexDataReadServiceApi;
  isMemoryEnabled: (request: KibanaRequest) => Promise<boolean>;
}): void => {
  router.versioned
    .post({
      path: RECALL_PATH,
      security: MEMORY_READ_SECURITY,
      access: 'public',
      summary: 'Recall context',
      description: [
        'Searches the AI indices named in `include` (`ai_index:*` or `ai_index:<ai_index_id>`) for Knowledge Indicators relevant to `query`, most relevant first. `session_events` and `session_memory` are accepted but return no results yet.',
        'The route needs the `contextEngine:read` privilege. Naming another user in `user_id` also needs `contextEngine:manage_memory`. AI indices are searched as the caller, who needs the Elasticsearch `read` privilege on their backing indices; an AI index the caller cannot read returns no results.',
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
              description: 'The recalled results.',
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
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (needsMemoryEnabled(request.body.include) && !(await isMemoryEnabled(request))) {
          return response.notFound({ body: { message: MEMORY_DISABLED_MESSAGE } });
        }

        const { elasticsearch, userProfile } = await ctx.core;
        try {
          const resolvedUser = await resolveMemoryUser({
            request,
            userProfile,
            requestedUserId: request.body.user_id,
          });
          if (!resolvedUser.ok) {
            return response.forbidden({ body: { message: resolvedUser.error.message } });
          }

          const aiIndexDataReadService = getAiIndexDataReadService({
            esClient: elasticsearch.client.asCurrentUser,
            request,
          });
          const recallService = await getRecallService();
          const body = await recallService.recall(
            { aiIndexDataReadService },
            {
              ...request.body,
              user_id: resolvedUser.userId,
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
          if (error instanceof AiIndexThrottledError) {
            return response.customError({
              statusCode: 429,
              body: { message: error.message },
            });
          }
          logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
          throw error;
        }
      })
    );
};

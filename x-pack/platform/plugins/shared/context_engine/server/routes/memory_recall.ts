/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { isResponseError } from '@kbn/es-errors';
import {
  AI_INDEX_API_VERSION,
  DEFAULT_RECALL_MAX_TOKENS,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDICES,
  MAX_RECALL_MAX_TOKENS,
  MAX_RECALL_QUERY_LENGTH,
  MAX_RECALL_SESSION_ID_LENGTH,
  MAX_RECALL_SESSION_IDS,
  MAX_RECALL_USER_ID_LENGTH,
  MEMORY_RECALL_PATH,
  MIN_RECALL_MAX_TOKENS,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RecallResponse } from '../../common/http_api/memory_recall';
import { RECALL_SOURCES } from '../../common/http_api/memory_recall';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import { createAiIndexRecallStore } from '../memory_recall/ai_index_store';
import { recall } from '../memory_recall/service';
import type { ContextEngineAnalyticsService } from '../telemetry';
import type { GetAiIndexDataReadServiceParams } from '../types';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const recallBodySchema = schema.object({
  query: schema.string({ minLength: 1, maxLength: MAX_RECALL_QUERY_LENGTH }),
  ai_index_ids: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_AI_INDEX_ID_LENGTH }), {
      maxSize: MAX_AI_INDICES,
    })
  ),
  user_id: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_RECALL_USER_ID_LENGTH })),
  session_ids: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_RECALL_SESSION_ID_LENGTH }), {
      maxSize: MAX_RECALL_SESSION_IDS,
    })
  ),
  sources: schema.arrayOf(
    schema.oneOf([
      schema.literal('session_events'),
      schema.literal('session_memory'),
      schema.literal('ai_index'),
    ]),
    { minSize: 1, maxSize: RECALL_SOURCES.length, defaultValue: [...RECALL_SOURCES] }
  ),
  max_tokens: schema.number({
    min: MIN_RECALL_MAX_TOKENS,
    max: MAX_RECALL_MAX_TOKENS,
    defaultValue: DEFAULT_RECALL_MAX_TOKENS,
  }),
  format: schema.oneOf([schema.literal('list'), schema.literal('text')], {
    defaultValue: 'list',
  }),
});

/** Registers the Recall route. AI indices are read as the CURRENT USER. */
export const registerMemoryRecallRoutes = ({
  router,
  getAiIndexDataReadService,
  analyticsService,
}: {
  router: IRouter;
  getAiIndexDataReadService: (params: GetAiIndexDataReadServiceParams) => AiIndexDataReadServiceApi;
  analyticsService: ContextEngineAnalyticsService;
}) => {
  router.versioned
    .post({
      path: MEMORY_RECALL_PATH,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Recall memory',
      description:
        'Returns the most relevant session events, session memories, and long-term context from AI indices for a question, ranked together and sized to a token limit.',
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.7.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: { request: { body: recallBodySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        try {
          const body: RecallResponse = await recall({
            esClient,
            stores: [createAiIndexRecallStore(getAiIndexDataReadService({ esClient, request }))],
            analyticsService,
            request: request.body,
          });
          return response.ok({ body });
        } catch (error) {
          if (isResponseError(error)) {
            const { statusCode, message } = error;
            if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
              return response.customError({ statusCode, body: { message } });
            }
          }
          throw error;
        }
      })
    );
};

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
  DEFAULT_RECALL_TOKEN_BUDGET,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDICES,
  MAX_RECALL_QUERY_LENGTH,
  MAX_RECALL_SESSION_ID_LENGTH,
  MAX_RECALL_SESSION_IDS,
  MAX_RECALL_TOKEN_BUDGET,
  MAX_RECALL_USER_ID_LENGTH,
  MEMORY_RECALL_PATH,
  MIN_RECALL_TOKEN_BUDGET,
  RECALL_AI_INDEX_PREFIX,
  RECALL_ALL_AI_INDICES,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RecallResponse } from '../../common/http_api/memory_recall';
import { AI_INDEX_ID_PATTERN } from '../../common/validation';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import { createAiIndexRecallStore } from '../memory_recall/ai_index_store';
import { recall } from '../memory_recall/service';
import type { ContextEngineAnalyticsService } from '../telemetry';
import type { GetAiIndexDataReadServiceParams } from '../types';
import { withContextEngineFeatureFlag } from './with_feature_flag';

/** Checks `manage_memory` without requiring it, so callers can recall their own memory. */
const RECALL_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [apiPrivileges.readContextEngine],
    extendedPrivileges: [apiPrivileges.manageMemory],
  },
};

const MANAGE_MEMORY_REQUIRED_MESSAGE = `Recalling the memory of another user requires the [${apiPrivileges.manageMemory}] privilege.`;

const isIncludable = (value: string): boolean => {
  if (value === 'session_events' || value === 'session_memory') {
    return true;
  }
  const aiIndexId = value.startsWith(RECALL_AI_INDEX_PREFIX)
    ? value.slice(RECALL_AI_INDEX_PREFIX.length)
    : undefined;
  return (
    aiIndexId !== undefined &&
    (aiIndexId === RECALL_ALL_AI_INDICES || AI_INDEX_ID_PATTERN.test(aiIndexId))
  );
};

const recallBodySchema = schema.object({
  query: schema.string({ minLength: 1, maxLength: MAX_RECALL_QUERY_LENGTH }),
  user_id: schema.string({ minLength: 1, maxLength: MAX_RECALL_USER_ID_LENGTH }),
  session_ids: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_RECALL_SESSION_ID_LENGTH }), {
      maxSize: MAX_RECALL_SESSION_IDS,
    })
  ),
  include: schema.arrayOf(
    schema.string({
      minLength: 1,
      maxLength: RECALL_AI_INDEX_PREFIX.length + MAX_AI_INDEX_ID_LENGTH,
      validate: (value) =>
        isIncludable(value)
          ? undefined
          : `expected session_events, session_memory, ${RECALL_AI_INDEX_PREFIX}<id> or ${RECALL_AI_INDEX_PREFIX}${RECALL_ALL_AI_INDICES}`,
    }),
    { minSize: 1, maxSize: MAX_AI_INDICES + 2 }
  ),
  token_budget: schema.number({
    min: MIN_RECALL_TOKEN_BUDGET,
    max: MAX_RECALL_TOKEN_BUDGET,
    defaultValue: DEFAULT_RECALL_TOKEN_BUDGET,
  }),
  format: schema.oneOf([schema.literal('json'), schema.literal('yaml')], {
    defaultValue: 'yaml',
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
      security: RECALL_SECURITY,
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
        const { elasticsearch, userProfile } = await ctx.core;
        const esClient = elasticsearch.client.asCurrentUser;
        const callerUserId = await userProfile.getCurrentProfileId();
        if (
          request.body.user_id !== callerUserId &&
          request.authzResult?.[apiPrivileges.manageMemory] !== true
        ) {
          return response.forbidden({ body: { message: MANAGE_MEMORY_REQUIRED_MESSAGE } });
        }
        try {
          const body: RecallResponse = await recall({
            esClient,
            stores: [
              createAiIndexRecallStore({
                esClient,
                dataReadService: getAiIndexDataReadService({ esClient, request }),
              }),
            ],
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

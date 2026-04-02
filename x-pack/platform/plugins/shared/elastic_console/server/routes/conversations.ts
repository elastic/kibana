/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, CoreStart, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { type ConversationRound, isToolCallStep } from '@kbn/agent-builder-common';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { createConversationClient } from '../lib/conversation_storage';
import { isElasticConsoleEnabled } from './is_enabled';

/**
 * Agent_builder stores tool_call step results as JSON strings (via serializeStepResults).
 * The CLI sends them as objects/arrays. Serialize them so agent_builder can deserialize
 * with JSON.parse when reading conversations back.
 */
const serializeConversationRounds = (rounds: ConversationRound[]): ConversationRound[] => {
  return rounds.map((round) => ({
    ...round,
    steps: round.steps.map((step) => {
      if (isToolCallStep(step) && step.results !== undefined && typeof step.results !== 'string') {
        return { ...step, results: JSON.stringify(step.results) };
      }
      return step;
    }),
  })) as ConversationRound[];
};

const getSpace = (basePath: string): string => {
  const spaceMatch = basePath.match(/(?:^|\/)s\/([^/]+)/);
  return spaceMatch ? spaceMatch[1] : 'default';
};

const getCurrentUser = async (
  coreStart: CoreStart,
  request: KibanaRequest
): Promise<{ userId?: string; username: string }> => {
  const authUser = coreStart.security.authc.getCurrentUser(request);
  if (authUser) {
    return { userId: authUser.profile_uid, username: authUser.username };
  }
  // Fallback for API key requests: call ES _security/_authenticate
  const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
  const authResponse = await esClient.security.authenticate();
  return { username: authResponse.username };
};

export const registerConversationRoutes = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  // List conversations
  router.get(
    {
      path: '/internal/elastic_ramen/conversations',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        query: schema.object({
          agent_id: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const client = createConversationClient(esClient);

        if (!(await client.indexExists())) {
          return response.ok({ body: { results: [] } });
        }

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const user = await getCurrentUser(coreStart, request);

        const filter: Array<Record<string, unknown>> = [
          { term: { space } },
          { term: { user_name: user.username } },
        ];
        if (request.query.agent_id) {
          filter.push({ term: { agent_id: request.query.agent_id } });
        }

        const results = await client.search({
          track_total_hits: false,
          size: 100,
          query: {
            bool: { filter },
          },
          _source: {
            excludes: ['conversation_rounds'],
          },
          sort: [{ updated_at: { order: 'desc' as const } }],
        });

        return response.ok({
          body: {
            results: results.hits.hits.map((hit) => ({
              id: hit._id,
              ...hit._source,
            })),
          },
        });
      } catch (error) {
        logger.error(`List conversations error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Get single conversation
  router.get(
    {
      path: '/internal/elastic_ramen/conversations/{id}',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const client = createConversationClient(esClient);

        if (!(await client.indexExists())) {
          return response.notFound();
        }

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const user = await getCurrentUser(coreStart, request);

        const result = await client.get({ id: request.params.id });

        const hit = result.hits.hits[0];
        if (
          !hit?._source ||
          hit._source.space !== space ||
          hit._source.user_name !== user.username
        ) {
          return response.notFound();
        }

        return response.ok({
          body: {
            id: hit._id,
            ...hit._source,
          },
        });
      } catch (error) {
        logger.error(`Get conversation error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Create conversation
  router.post(
    {
      path: '/internal/elastic_ramen/conversations',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        body: schema.object({
          agent_id: schema.string(),
          title: schema.string(),
          conversation_rounds: schema.arrayOf(schema.recordOf(schema.string(), schema.any()), {
            defaultValue: [],
          }),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const client = createConversationClient(esClient);

        if (!(await client.indexExists())) {
          return response.customError({
            statusCode: 503,
            body: {
              message:
                'Conversation storage is not yet initialized. Start a conversation in Agent Builder first.',
            },
          });
        }

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const user = await getCurrentUser(coreStart, request);

        const id = uuidv4();
        const now = new Date().toISOString();
        const rounds = request.body.conversation_rounds as unknown as ConversationRound[];

        await client.index({
          id,
          document: {
            agent_id: request.body.agent_id,
            title: request.body.title,
            conversation_rounds: serializeConversationRounds(rounds),
            user_id: user.userId,
            user_name: user.username,
            space,
            created_at: now,
            updated_at: now,
          },
        });

        return response.ok({
          body: { id },
        });
      } catch (error) {
        logger.error(`Create conversation error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Update conversation
  router.put(
    {
      path: '/internal/elastic_ramen/conversations/{id}',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          title: schema.maybe(schema.string()),
          conversation_rounds: schema.maybe(
            schema.arrayOf(schema.recordOf(schema.string(), schema.any()))
          ),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const client = createConversationClient(esClient);

        if (!(await client.indexExists())) {
          return response.customError({
            statusCode: 503,
            body: {
              message:
                'Conversation storage is not yet initialized. Start a conversation in Agent Builder first.',
            },
          });
        }

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const user = await getCurrentUser(coreStart, request);

        const existing = await client.get({ id: request.params.id });

        const hit = existing.hits.hits[0];
        if (
          !hit?._source ||
          hit._source.space !== space ||
          hit._source.user_name !== user.username
        ) {
          return response.notFound();
        }

        const rounds = request.body.conversation_rounds as unknown as
          | ConversationRound[]
          | undefined;

        const updatedDoc = {
          ...hit._source,
          ...(request.body.title !== undefined && { title: request.body.title }),
          ...(rounds !== undefined && {
            conversation_rounds: serializeConversationRounds(rounds),
          }),
          updated_at: new Date().toISOString(),
        };

        await client.index({
          id: request.params.id,
          document: updatedDoc,
        });

        return response.ok({
          body: { id: request.params.id },
        });
      } catch (error) {
        logger.error(`Update conversation error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );
};

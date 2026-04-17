/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { createConversationStorage } from '../lib/conversation_storage';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';
import {
  SLACK_SESSION_SO_TYPE,
  slackSessionSoId,
  type SlackSessionAttributes,
} from '../lib/slack_session_so';
import { sendHandoffNotification, type ConversationRound } from '../lib/notification_service';
import { isElasticConsoleEnabled } from './is_enabled';

const isNotFound = (error: unknown): boolean => {
  const e = error as { statusCode?: number; meta?: { statusCode?: number } };
  return e?.statusCode === 404 || e?.meta?.statusCode === 404;
};

export const registerConversationSessionRoutes = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  // POST /internal/elastic_console/conversations/:id/locate
  // Moves a conversation to a new location (e.g. cli, mcp).
  router.post(
    {
      path: '/internal/elastic_console/conversations/{id}/locate',
      security: {
        authz: {
          enabled: false,
          reason: 'Caller authenticates via Kibana API key; no additional authz needed',
        },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({ location: schema.string() }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const soClient = coreStart.savedObjects.createInternalRepository([SLACK_SESSION_SO_TYPE]);
        const soId = slackSessionSoId(request.params.id);

        let sessionSo;
        try {
          sessionSo = await soClient.get<SlackSessionAttributes>(SLACK_SESSION_SO_TYPE, soId);
        } catch (soErr) {
          if (isNotFound(soErr)) {
            return response.notFound({ body: { message: 'Session not found' } });
          }
          throw soErr;
        }

        const { location } = request.body;
        const { origin_ref: originRef, connector_id: connectorId } = sessionSo.attributes;

        await soClient.update<SlackSessionAttributes>(SLACK_SESSION_SO_TYPE, soId, {
          location,
          located_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Fetch the conversation doc so the CLI gets full history + metadata in one call
        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createConversationStorage({ esClient, logger });
        const conv = await storage.get({ id: request.params.id });

        return response.ok({
          body: {
            conversation: conv.found ? { id: request.params.id, ...conv._source } : null,
            origin_ref: originRef ?? null,
            connector_id: connectorId ?? null,
          },
        });
      } catch (error) {
        if (isNotFound(error)) {
          return response.notFound({ body: { message: 'Session not found' } });
        }
        logger.error(`Locate conversation error: ${(error as Error).message}`);
        return response.customError({
          statusCode: (error as { statusCode?: number }).statusCode || 500,
          body: { message: (error as Error).message },
        });
      }
    }
  );

  // POST /internal/elastic_console/conversations/:id/handoff
  // Returns a conversation to its origin location.
  router.post(
    {
      path: '/internal/elastic_console/conversations/{id}/handoff',
      security: {
        authz: {
          enabled: false,
          reason: 'Caller authenticates via Kibana API key; no additional authz needed',
        },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({
          summary: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const soClient = coreStart.savedObjects.createInternalRepository([SLACK_SESSION_SO_TYPE]);
        const soId = slackSessionSoId(request.params.id);

        let sessionSo;
        try {
          sessionSo = await soClient.get<SlackSessionAttributes>(SLACK_SESSION_SO_TYPE, soId);
        } catch (soErr) {
          if (isNotFound(soErr)) {
            return response.notFound({ body: { message: 'Session not found' } });
          }
          throw soErr;
        }

        const {
          origin_location: originLocation,
          origin_ref: originRef,
          fork_context: forkContext,
        } = sessionSo.attributes;

        const updates: Partial<SlackSessionAttributes> = {
          updated_at: new Date().toISOString(),
        };
        if (originLocation) {
          updates.location = originLocation;
        }
        if (request.body.summary) {
          updates.handoff_summary = request.body.summary;
        }

        await soClient.update<SlackSessionAttributes>(SLACK_SESSION_SO_TYPE, soId, updates);

        // Load the conversation for the notification rounds.
        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createConversationStorage({ esClient, logger });
        const conv = await storage.get({ id: request.params.id });
        const existingRounds = conv.found
          ? (conv._source?.conversation_rounds as ConversationRound[]) ?? []
          : [];

        // The summary is stored in handoff_summary on the SO and injected into
        // the system prompt by the Slack handler — no synthetic conversation round
        // needed (which would confuse the LLM with "[Investigation complete]" as
        // a prior user message).

        // If the origin is Slack, post a notification to the original thread.
        // Best-effort — a notification failure does not fail the handoff.
        if (originRef?.startsWith('slack:')) {
          // Only include rounds added after the fork (not the inherited parent history).
          const parentRoundCount = forkContext ? parseInt(forkContext, 10) : 0;
          const roundsForNotification = isNaN(parentRoundCount)
            ? existingRounds
            : existingRounds.slice(parentRoundCount);
          setImmediate(async () => {
            try {
              const esoClient = pluginsStart.encryptedSavedObjects.getClient({
                includedHiddenTypes: [SLACK_CREDENTIALS_SO_TYPE],
              });
              const creds = await esoClient.getDecryptedAsInternalUser<{ bot_token: string }>(
                SLACK_CREDENTIALS_SO_TYPE,
                SLACK_CREDENTIALS_SO_ID
              );
              await sendHandoffNotification(creds.attributes.bot_token, {
                originRef,
                summary: request.body.summary,
                rounds: roundsForNotification,
              });
            } catch (notifyErr) {
              logger.warn(`Handoff Slack notification failed: ${(notifyErr as Error).message}`);
            }
          });
        }

        return response.ok({
          body: {
            origin_location: originLocation ?? null,
            origin_ref: originRef ?? null,
          },
        });
      } catch (error) {
        if (isNotFound(error)) {
          return response.notFound({ body: { message: 'Session not found' } });
        }
        logger.error(`Handoff conversation error: ${(error as Error).message}`);
        return response.customError({
          statusCode: (error as { statusCode?: number }).statusCode || 500,
          body: { message: (error as Error).message },
        });
      }
    }
  );
};

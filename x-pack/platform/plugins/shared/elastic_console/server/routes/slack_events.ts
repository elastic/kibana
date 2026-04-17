/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';
import { handleSlackEvent } from '../lib/slack_handler';

// POST /api/elastic_console/slack/events
//
// Receives Slack events forwarded by the elastic-console-connect router.
// Trust chain: Slack → Elastic's router (verifies X-Slack-Signature) → Kibana (verifies API key).
//
// The router authenticates to Kibana using the API key embedded in the JWT state
// during the OAuth flow (Authorization: ApiKey <key>). Direct calls from the
// internet without a valid API key are rejected by Kibana's auth layer.
//
// Slack request signing verification is intentionally handled by the router,
// not here — the signing secret is Elastic-owned and cannot be distributed to
// customer Kibana deployments.

export const registerSlackEventsRoute = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  router.post(
    {
      path: '/api/elastic_console/slack/events',
      security: {
        authz: {
          enabled: false,
          reason:
            'Authz handled by the Kibana API key generated during Slack OAuth — ' +
            'the router forwards events with Authorization: ApiKey <key>.',
        },
      },
      // authRequired: true — only the elastic-console-connect router (which holds
      // the scoped API key from /slack/connect) can POST here. Direct calls from
      // the internet without a valid API key are rejected.
      options: { access: 'public', authRequired: true, xsrfRequired: false },
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (ctx, request, response) => {
      const body = request.body as Record<string, unknown>;

      // Handle Slack URL verification challenge (one-time during app setup)
      if (body.type === 'url_verification') {
        return response.ok({ body: { challenge: body.challenge } });
      }

      if (body.type !== 'event_callback') {
        return response.ok({ body: { ok: true } });
      }

      const event = body.event as Record<string, unknown> | undefined;
      if (!event) {
        return response.ok({ body: { ok: true } });
      }

      // Ack immediately — Slack requires a 200 within 3 seconds.
      // Processing runs asynchronously after the response is sent.
      setImmediate(async () => {
        try {
          const [coreStart, pluginsStart] = await coreSetup.getStartServices();

          // Load bot token from encrypted saved objects
          const esoClient = pluginsStart.encryptedSavedObjects.getClient({
            includedHiddenTypes: [SLACK_CREDENTIALS_SO_TYPE],
          });

          let botToken: string;
          let inferenceRequest: KibanaRequest;
          try {
            const creds = await esoClient.getDecryptedAsInternalUser<{
              bot_token: string;
              kibana_api_key: string;
            }>(SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID);
            botToken = creds.attributes.bot_token;
            // Use the stored API key to create an authenticated request for
            // inference calls — Slack events arrive unauthenticated.
            inferenceRequest = {
              ...request,
              headers: {
                ...request.headers,
                authorization: `ApiKey ${creds.attributes.kibana_api_key}`,
              },
            } as unknown as KibanaRequest;
          } catch (credErr) {
            logger.warn(
              `Slack event received but no bot_token stored yet — run /slack/connect first: ${
                (credErr as Error).message
              }`
            );
            return;
          }

          await handleSlackEvent({
            event: {
              type: event.type as string,
              ts: event.ts as string,
              channel: event.channel as string,
              thread_ts: event.thread_ts as string | undefined,
              text: event.text as string | undefined,
              user: event.user as string | undefined,
            },
            botToken,
            coreStart,
            inference: pluginsStart.inference,
            request: inferenceRequest,
            logger,
          });
        } catch (error) {
          logger.error(`Slack event processing error: ${(error as Error).message}`);
        }
      });

      return response.ok({ body: { ok: true } });
    }
  );
};

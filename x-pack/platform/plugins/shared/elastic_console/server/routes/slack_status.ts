/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';

// GET /internal/elastic_console/slack/status
//
// Returns the current Slack connection status:
//   - connected: credentials are stored and the API key is valid
//   - disconnected: credentials are stored but the API key has been revoked (401)
//   - not_connected: no credentials found (OAuth never completed)
//
// Used by the settings UI to surface "⚠️ Reconnect Slack" when the key is revoked.

export type SlackConnectionStatus = 'connected' | 'disconnected' | 'not_connected';

export interface SlackStatusResponse {
  status: SlackConnectionStatus;
  connected_at?: string; // ISO timestamp from updated_at when credentials were stored
}

export const registerSlackStatusRoute = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  router.get(
    {
      path: '/internal/elastic_console/slack/status',
      security: { authz: { requiredPrivileges: ['agentBuilder:read'] } },
      options: { access: 'internal' },
      validate: false,
    },
    async (ctx, request, response) => {
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();

      // Step 1 — check if credentials have ever been stored
      const esoClient = pluginsStart.encryptedSavedObjects.getClient({
        includedHiddenTypes: [SLACK_CREDENTIALS_SO_TYPE],
      });

      let kibanaApiKey: string;
      let connectedAt: string | undefined;

      try {
        const creds = await esoClient.getDecryptedAsInternalUser<{
          bot_token: string;
          kibana_api_key: string;
          updated_at?: string;
        }>(SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID);

        kibanaApiKey = creds.attributes.kibana_api_key;
        connectedAt = creds.attributes.updated_at;
      } catch (credErr) {
        logger.debug(`Slack credentials not found — reporting not_connected: ${(credErr as Error).message}`);
        return response.ok({
          body: { status: 'not_connected' } satisfies SlackStatusResponse,
        });
      }

      // Step 2 — validate the API key is still active by calling /_security/api_key
      // A 401 (InvalidApiKey / ApiKeyNotFound) means the key was revoked or expired.
      try {
        const esClient = coreStart.elasticsearch.client.asInternalUser;
        // Decode base64 id:api_key to extract the key id for lookup
        const decoded = Buffer.from(kibanaApiKey, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        const keyId = colonIdx !== -1 ? decoded.slice(0, colonIdx) : null;

        if (keyId) {
          // owner: true restricts the lookup to keys owned by asInternalUser (kibana_system).
          // This only requires manage_own_api_key — no need for the broader manage_api_key.
          // The inference key is created via asInternalUser in /slack/token, so ownership matches.
          const result = await esClient.security.getApiKey({ id: keyId, owner: true });
          const keyInfo = result.api_keys?.[0];

          if (!keyInfo || keyInfo.invalidated) {
            logger.debug(`Slack API key ${keyId} is invalidated`);
            return response.ok({
              body: {
                status: 'disconnected',
                connected_at: connectedAt,
              } satisfies SlackStatusResponse,
            });
          }
        }
      } catch (err) {
        // ES returned an error looking up the key — treat as disconnected
        logger.debug(`Could not verify Slack API key status: ${(err as Error).message}`);
        return response.ok({
          body: {
            status: 'disconnected',
            connected_at: connectedAt,
          } satisfies SlackStatusResponse,
        });
      }

      return response.ok({
        body: {
          status: 'connected',
          connected_at: connectedAt,
        } satisfies SlackStatusResponse,
      });
    }
  );
};

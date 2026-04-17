/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';

// DELETE /internal/elastic_console/slack/disconnect
//
// Revokes the Slack integration:
//   1. Reads the stored kibana_api_key from ESO
//   2. Invalidates that API key in ES so the router can no longer forward events
//   3. Deletes the credentials saved object (bot_token + kibana_api_key)
//
// After this the status endpoint returns 'not_connected'.

export const registerSlackDisconnectRoute = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  router.delete(
    {
      path: '/internal/elastic_console/slack/disconnect',
      security: { authz: { requiredPrivileges: ['agentBuilder:write'] } },
      options: { access: 'internal' },
      validate: false,
    },
    async (ctx, request, response) => {
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();

      const esoClient = pluginsStart.encryptedSavedObjects.getClient({
        includedHiddenTypes: [SLACK_CREDENTIALS_SO_TYPE],
      });

      // Step 1 — read and invalidate the stored API key
      try {
        const creds = await esoClient.getDecryptedAsInternalUser<{
          kibana_api_key: string;
        }>(SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID);

        const decoded = Buffer.from(creds.attributes.kibana_api_key, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        const keyId = colonIdx !== -1 ? decoded.slice(0, colonIdx) : null;

        if (keyId) {
          try {
            await coreStart.elasticsearch.client.asInternalUser.security.invalidateApiKey({
              ids: [keyId],
              owner: true,
            });
            logger.info(`Slack inference API key ${keyId} invalidated`);
          } catch (invalidateErr) {
            // Key may already be gone — log and continue with SO deletion
            logger.warn(
              `Could not invalidate Slack API key ${keyId}: ${(invalidateErr as Error).message}`
            );
          }
        }
      } catch (credErr) {
        logger.debug(`Slack credentials not found during disconnect — skipping key invalidation: ${(credErr as Error).message}`);
      }

      // Step 2 — delete the credentials SO
      try {
        const soClient = coreStart.savedObjects.createInternalRepository([SLACK_CREDENTIALS_SO_TYPE]);
        await soClient.delete(SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID);
        logger.info('Slack credentials saved object deleted');
      } catch (deleteErr) {
        logger.warn(`Could not delete Slack credentials SO: ${(deleteErr as Error).message}`);
      }

      return response.ok({ body: { ok: true } });
    }
  );
};

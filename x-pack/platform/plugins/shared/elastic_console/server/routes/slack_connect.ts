/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsoleConfig } from '../config';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';

const SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_REDIRECT_URI_DEFAULT = 'https://connect.elastic.co/slack/oauth_redirect';
const SLACK_SCOPES = 'app_mentions:read,chat:write,channels:history,commands,im:write';
const JWT_EXPIRY_SECS = 600; // 10 minutes

const signJwt = (payload: Record<string, unknown>, secret: string): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

export const registerSlackConnectRoute = ({
  router,
  coreSetup,
  logger,
  config,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
  config: ElasticConsoleConfig;
}) => {
  router.get(
    {
      path: '/internal/elastic_console/slack/connect',
      security: { authz: { requiredPrivileges: ['agentBuilder:write'] } },
      options: { access: 'internal' },
      validate: false,
    },
    async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();

      // Generate a Kibana API key scoped to the Slack events endpoint.
      // The router stores this key and sends it as Authorization: ApiKey <key>
      // on every forwarded Slack event — Kibana verifies it natively.
      const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

      // Invalidate previous connect keys before creating a new one (re-connect flow).
      // Use the connect-specific prefix so inference keys are not affected.
      try {
        await esClient.security.invalidateApiKey({ name: 'elastic-console-slack-connect-*' });
      } catch (err) {
        logger.warn(`Failed to invalidate stale Slack connect keys: ${(err as Error).message}`);
      }

      let kibanaApiKey: string;
      try {
        const apiKeyResult = await esClient.security.createApiKey({
          name: `elastic-console-slack-connect-${Date.now()}`,
          metadata: {
            managed_by: 'elastic_console',
            purpose: 'slack_router_auth',
            description: 'Authenticates the elastic-console-connect router to forward Slack events',
          },
          // No expiration — key lives until manually revoked (re-connect regenerates).
          role_descriptors: {
            'elastic-console-slack': {
              // manage_own_api_key lets /slack/token create a scoped inference key
              // on behalf of this principal without needing a superuser.
              cluster: ['manage_own_api_key'],
              indices: [],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['api:elastic_console/slack/events'],
                  resources: ['*'],
                },
              ],
            },
          },
        });
        kibanaApiKey = Buffer.from(`${apiKeyResult.id}:${apiKeyResult.api_key}`).toString('base64');
      } catch (err) {
        logger.error(`Failed to create Slack API key: ${(err as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to generate Slack integration credentials' },
        });
      }

      const serverInfo = coreStart.http.getServerInfo();
      const kibanaUrl =
        coreStart.http.basePath.publicBaseUrl ??
        `${serverInfo.protocol}://localhost:${serverInfo.port}${coreStart.http.basePath.serverBasePath}`;

      // Self-authenticating state JWT: signed with the kibana_api_key itself.
      // No shared secret needed — the router verifies by extracting kibana_api_key
      // from the payload and recomputing the HMAC. Tampering with any field
      // (including kibana_url) invalidates the signature.
      // Trade-off: kibana_api_key is visible in the JWT payload (base64, not encrypted).
      // Mitigations: key is scoped to one privilege, 10-min expiry, HTTPS transport.
      const jwtPayload = {
        kibana_url: kibanaUrl,
        kibana_api_key: kibanaApiKey,
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECS,
      };

      const state = signJwt(jwtPayload, kibanaApiKey);

      const clientId = config.slack?.client_id;
      if (!clientId) {
        return response.badRequest({
          body: { message: 'xpack.elastic_console.slack.client_id is not configured' },
        });
      }

      const redirectUri = config.slack?.redirect_uri ?? SLACK_REDIRECT_URI_DEFAULT;

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: SLACK_SCOPES,
        state,
      });

      return response.ok({ body: { url: `${SLACK_OAUTH_URL}?${params}` } });
    }
  );
};

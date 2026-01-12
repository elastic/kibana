/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import type { ILicenseState } from '../lib';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import type { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from './constants';
import { OAuthStateClient } from '../lib/oauth_state_client';
import { OAuthAuthorizationService } from '../lib/oauth_authorization_service';
import type { ActionsPluginsStart } from '../plugin';
import type { OAuthRateLimiter } from '../lib/oauth_rate_limiter';

const paramsSchema = schema.object({
  connectorId: schema.string(),
});
/**
 * Initiates OAuth2 Authorization Code flow
 * Returns authorization URL for user to visit
 */
export const oauthAuthorizeRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  logger: Logger,
  coreSetup: CoreSetup<ActionsPluginsStart>,
  oauthRateLimiter: OAuthRateLimiter
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/{connectorId}/_oauth_authorize`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      validate: {
        params: paramsSchema,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { connectorId } = req.params;

        try {
          const core = await context.core;
          const routeLogger = logger.get('oauth_authorize');
          const currentUser = core.security.authc.getCurrentUser();
          if (!currentUser) {
            throw new Error('User should be authenticated to initiate OAuth authorization.');
          }
          const username = currentUser.username;

          oauthRateLimiter.log(username, 'authorize');
          if (oauthRateLimiter.isRateLimited(username, 'authorize')) {
            routeLogger.warn(
              `OAuth authorize rate limit exceeded for user: ${username}, connector: ${connectorId}`
            );
            return res.customError({
              statusCode: 429,
              body: {
                message: 'Too many authorization attempts. Please try again later.',
              },
            });
          }

          const actionsClient = (await context.actions).getActionsClient();

          const [coreStart, { encryptedSavedObjects }] = await coreSetup.getStartServices();
          const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
            includedHiddenTypes: ['action', 'oauth_state'],
          });
          const kibanaUrl = coreStart.http.basePath.publicBaseUrl;

          if (!kibanaUrl) {
            return res.badRequest({
              body: {
                message:
                  'Kibana public URL not configured. Please set server.publicBaseUrl in kibana.yml',
              },
            });
          }

          const oauthService = new OAuthAuthorizationService(
            actionsClient,
            encryptedSavedObjectsClient,
            kibanaUrl,
            routeLogger
          );

          // Get OAuth configuration (validates connector and retrieves decrypted config)
          const oauthConfig = await oauthService.getOAuthConfig(connectorId);

          const redirectUri = oauthService.getRedirectUri(oauthConfig);

          // Build return URL for post-OAuth redirect
          const kibanaReturnUrl = `${kibanaUrl}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`;

          // Create OAuth state with PKCE
          const oauthStateClient = new OAuthStateClient({
            encryptedSavedObjectsClient,
            unsecuredSavedObjectsClient: core.savedObjects.getClient({
              includedHiddenTypes: ['oauth_state'],
            }),
            logger: routeLogger,
          });
          const { state, codeChallenge } = await oauthStateClient.create({
            connectorId,
            redirectUri,
            kibanaReturnUrl,
          });

          const authorizationUrl = oauthService.buildAuthorizationUrl({
            baseAuthorizationUrl: oauthConfig.authorizationUrl,
            clientId: oauthConfig.clientId,
            scope: oauthConfig.scope,
            redirectUri,
            state: state.state,
            codeChallenge,
          });

          return res.ok({
            body: {
              authorizationUrl,
              state: state.state,
            },
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const statusCode =
            err instanceof Error && 'statusCode' in err
              ? (err as Error & { statusCode: number }).statusCode
              : 500;

          return res.customError({
            statusCode,
            body: {
              message: errorMessage || 'Failed to initiate OAuth authorization',
            },
          });
        }
      })
    )
  );
};

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

const bodySchema = schema.object({
  returnUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
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
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/{connectorId}/_start_oauth_flow`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      validate: {
        params: paramsSchema,
        body: bodySchema,
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

          // Check rate limit
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

          const [coreStart, { encryptedSavedObjects }] = await coreSetup.getStartServices();
          const kibanaUrl = coreStart.http.basePath.publicBaseUrl;
          if (!kibanaUrl) {
            return res.badRequest({
              body: {
                message:
                  'Kibana public URL not configured. Please set server.publicBaseUrl in kibana.yml',
              },
            });
          }

          // Get OAuth configuration (validates connector and retrieves decrypted config)
          const oauthService = new OAuthAuthorizationService({
            actionsClient: (await context.actions).getActionsClient(),
            encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
              includedHiddenTypes: ['action'],
            }),
            kibanaBaseUrl: kibanaUrl,
            logger: routeLogger,
          });
          const oauthConfig = await oauthService.getOAuthConfig(connectorId);
          const redirectUri = oauthService.getRedirectUri(oauthConfig);

          // Validate and build return URL for post-OAuth redirect
          const requestedReturnUrl = req.body?.returnUrl;
          let kibanaReturnUrl: string;

          if (requestedReturnUrl) {
            // Security: Validate that returnUrl is same-origin to prevent open redirect attacks
            const returnUrlObj = new URL(requestedReturnUrl);
            const kibanaUrlObj = new URL(kibanaUrl);

            if (returnUrlObj.origin !== kibanaUrlObj.origin) {
              return res.badRequest({
                body: {
                  message: `returnUrl must be same origin as Kibana. Expected: ${kibanaUrlObj.origin}, Got: ${returnUrlObj.origin}`,
                },
              });
            }
            kibanaReturnUrl = requestedReturnUrl;
          } else {
            // Default to connectors management page
            kibanaReturnUrl = `${kibanaUrl}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`;
          }

          // Create OAuth state with PKCE
          const oauthStateClient = new OAuthStateClient({
            encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
              includedHiddenTypes: ['oauth_state'],
            }),
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

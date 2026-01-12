/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import startCase from 'lodash/startCase';
import type { ActionsPluginsStart } from '../plugin';
import type { ILicenseState } from '../lib';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { DEFAULT_ACTION_ROUTE_SECURITY } from './constants';
import { verifyAccessAndContext } from './verify_access_and_context';
import { OAuthStateClient } from '../lib/oauth_state_client';
import { requestOAuthAuthorizationCodeToken } from '../lib/request_oauth_authorization_code_token';
import { ConnectorTokenClient } from '../lib/connector_token_client';
import type { OAuthRateLimiter } from '../lib/oauth_rate_limiter';

const querySchema = schema.object({
  code: schema.maybe(schema.string()),
  state: schema.maybe(schema.string()),
  error: schema.maybe(schema.string()),
  error_description: schema.maybe(schema.string()),
  session_state: schema.maybe(schema.string()), // Microsoft OAuth includes this
});

interface OAuthConnectorSecrets {
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  useBasicAuth?: boolean;
}

interface OAuthConnectorConfig {
  clientId?: string;
  tokenUrl?: string;
  useBasicAuth?: boolean;
}

/**
 * Generates a styled OAuth callback page using EUI-like styling
 */
function generateOAuthCallbackPage({
  title,
  heading,
  message,
  details,
  isSuccess,
  autoClose,
}: {
  title: string;
  heading: string;
  message: string;
  details?: string;
  isSuccess: boolean;
  autoClose?: boolean;
}): string {
  const iconColor = isSuccess ? '#00BFB3' : '#BD271E';
  const icon = isSuccess ? '✓' : '✕';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            background-color: #F5F7FA;
            color: #343741;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
            padding: 32px;
            text-align: center;
          }
          .icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background-color: ${iconColor};
            color: white;
            font-size: 32px;
            line-height: 64px;
            margin: 0 auto 24px;
            font-weight: 600;
          }
          h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1a1c21;
          }
          p {
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 12px;
            color: #69707d;
          }
          p:last-child {
            margin-bottom: 0;
          }
          .details {
            background-color: #F5F7FA;
            border-left: 3px solid ${iconColor};
            padding: 12px 16px;
            margin: 16px 0;
            text-align: left;
            font-size: 13px;
            color: #343741;
            border-radius: 4px;
          }
        </style>
        ${
          autoClose
            ? `<script>
          setTimeout(() => {
            window.close();
            // If window.close() doesn't work (not opened by script), show message
            setTimeout(() => {
              document.querySelector('.auto-close-message').style.display = 'block';
            }, 100);
          }, 3000);
        </script>`
            : ''
        }
      </head>
      <body>
        <div class="container">
          <div class="icon">${icon}</div>
          <h1>${heading}</h1>
          <p>${message}</p>
          ${details ? `<div class="details">${details}</div>` : ''}
          ${
            autoClose
              ? '<p style="display: none; margin-top: 16px;" class="auto-close-message">This window will close automatically, or you can close it manually.</p>'
              : ''
          }
        </div>
      </body>
    </html>
  `;
}

/**
 * OAuth2 callback endpoint - handles authorization code exchange
 */
export const oauthCallbackRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  coreSetup: CoreSetup<ActionsPluginsStart>,
  oauthRateLimiter: OAuthRateLimiter
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/_oauth_callback`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      validate: {
        query: querySchema,
      },
      options: {
        access: 'public',
        // authRequired: true is the default - user must have valid session
        // The OAuth redirect happens in their browser, so they will have their session cookie
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const core = await context.core;
        const routeLogger = logger.get('oauth_callback');

        // Check rate limit
        const currentUser = core.security.authc.getCurrentUser();
        if (!currentUser) {
          return res.unauthorized({
            headers: { 'content-type': 'text/html' },
            body: generateOAuthCallbackPage({
              title: 'Authorization Failed',
              heading: 'Authentication Required',
              message: 'User should be authenticated to complete OAuth callback.',
              details: 'Please log in and try again.',
              isSuccess: false,
            }),
          });
        }
        const username = currentUser.username;
        oauthRateLimiter.log(username, 'callback');
        if (oauthRateLimiter.isRateLimited(username, 'callback')) {
          routeLogger.warn(`OAuth callback rate limit exceeded for user: ${username}`);
          return res.ok({
            headers: { 'content-type': 'text/html' },
            body: generateOAuthCallbackPage({
              title: 'OAuth Authorization Failed',
              heading: 'Too Many Requests',
              message: 'You have made too many authorization attempts.',
              details: 'Please wait before trying again.',
              isSuccess: false,
            }),
          });
        }

        // Handle OAuth errors or missing parameters
        const { code, state: stateParam, error, error_description: errorDescription } = req.query;
        if (error || !code || !stateParam) {
          const errorMessage = error || 'Missing required OAuth parameters (code or state)';
          const details = errorDescription
            ? `${errorMessage}\n\n${errorDescription}`
            : errorMessage;

          return res.ok({
            headers: { 'content-type': 'text/html' },
            body: generateOAuthCallbackPage({
              title: 'OAuth Authorization Failed',
              heading: 'Authorization Failed',
              message: 'You can close this window and try again.',
              details,
              isSuccess: false,
            }),
          });
        }

        try {
          const [, { encryptedSavedObjects }] = await coreSetup.getStartServices();

          // Retrieve and validate state
          const oauthStateClient = new OAuthStateClient({
            encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
              includedHiddenTypes: ['oauth_state'],
            }),
            unsecuredSavedObjectsClient: core.savedObjects.getClient({
              includedHiddenTypes: ['oauth_state'],
            }),
            logger: routeLogger,
          });
          const oauthState = await oauthStateClient.get(stateParam);
          if (!oauthState) {
            return res.ok({
              headers: { 'content-type': 'text/html' },
              body: generateOAuthCallbackPage({
                title: 'OAuth Authorization Failed',
                heading: 'Authorization Failed',
                message: 'You can close this window and try again.',
                details:
                  'Invalid or expired state parameter. The authorization session may have timed out.',
                isSuccess: false,
              }),
            });
          }

          // Get connector with decrypted secrets
          const connectorEncryptedClient = encryptedSavedObjects.getClient({
            includedHiddenTypes: ['action'],
          });
          const rawAction = await connectorEncryptedClient.getDecryptedAsInternalUser<{
            actionTypeId: string;
            name: string;
            config: OAuthConnectorConfig;
            secrets: OAuthConnectorSecrets;
          }>('action', oauthState.connectorId);

          const config = rawAction.attributes.config;
          const secrets = rawAction.attributes.secrets;
          // Extract OAuth config - for connector specs, secrets are stored directly
          const clientId = secrets.clientId || config?.clientId;
          const clientSecret = secrets.clientSecret;
          const tokenUrl = secrets.tokenUrl || config?.tokenUrl;
          const useBasicAuth = secrets.useBasicAuth ?? config?.useBasicAuth ?? true; // Default to true (OAuth 2.0 recommended practice)
          if (!clientId || !clientSecret || !tokenUrl) {
            throw new Error(
              'Connector missing required OAuth configuration (clientId, clientSecret, tokenUrl)'
            );
          }

          // Exchange authorization code for tokens
          // TODO: couldn't this be either an Opaque token (as below) or a JWT token (requestOAuthJWTToken)?
          // depending on the 3rd party's implementation of the token endpoint
          const tokenResult = await requestOAuthAuthorizationCodeToken(
            tokenUrl,
            logger,
            {
              code,
              redirectUri: oauthState.redirectUri,
              codeVerifier: oauthState.codeVerifier,
              clientId,
              clientSecret,
            },
            configurationUtilities,
            useBasicAuth
          );
          routeLogger.debug(
            `Successfully exchanged authorization code for access token for connectorId: ${oauthState.connectorId}`
          );

          // Store tokens - first delete any existing tokens for this connector then create a new token record
          const connectorTokenClient = new ConnectorTokenClient({
            encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
              includedHiddenTypes: ['connector_token'],
            }),
            unsecuredSavedObjectsClient: core.savedObjects.getClient({
              includedHiddenTypes: ['connector_token'],
            }),
            logger: routeLogger,
          });
          await connectorTokenClient.deleteConnectorTokens({
            connectorId: oauthState.connectorId,
            tokenType: 'access_token',
          });
          // Some providers return "bearer" instead of "Bearer", but expect "Bearer" in the header,
          // so we normalize the token type, i.e., capitalize first letter (e.g., "bearer" -> "Bearer")
          const normalizedTokenType = startCase(tokenResult.tokenType);
          const formattedToken = `${normalizedTokenType} ${tokenResult.accessToken}`;
          await connectorTokenClient.createWithRefreshToken({
            connectorId: oauthState.connectorId,
            accessToken: formattedToken,
            refreshToken: tokenResult.refreshToken,
            expiresIn: tokenResult.expiresIn,
            refreshTokenExpiresIn: tokenResult.refreshTokenExpiresIn,
            tokenType: 'access_token',
          });

          // Clean up state
          await oauthStateClient.delete(oauthState.id);

          // Redirect to Kibana
          const returnUrl = new URL(oauthState.kibanaReturnUrl);
          return res.redirected({
            headers: {
              location: returnUrl.toString(),
            },
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          routeLogger.error(`OAuth callback failed: ${errorMessage}`);
          if (err instanceof Error && err.stack) {
            routeLogger.debug(`OAuth callback error stack: ${err.stack}`);
          }
          return res.ok({
            headers: { 'content-type': 'text/html' },
            body: generateOAuthCallbackPage({
              title: 'OAuth Authorization Failed',
              heading: 'Authorization Failed',
              message: 'You can close this window and try again.',
              details: errorMessage,
              isSuccess: false,
            }),
          });
        }
      })
    )
  );
};

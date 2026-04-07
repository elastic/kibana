/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import { getEarsEndpointsForProvider, resolveEarsUrl } from '../lib/ears';
import type { ILicenseState } from '../lib';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import type { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';
import { OAuthStateClient } from '../lib/oauth_state_client';
import { OAuthAuthorizationService, type OAuthConfig } from '../lib/oauth_authorization_service';
import type { ActionsPluginsStart } from '../plugin';
import type { OAuthRateLimiter } from '../lib/oauth_rate_limiter';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { OAUTH_API_TAG } from '../feature';

const paramsSchema = schema.object({
  connectorId: schema.string(),
});

const bodySchema = schema.object({
  returnUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
});

const validateOAuthUrlsAreAllowed = (
  oauthConfig: OAuthConfig,
  actionsConfigUtils: ActionsConfigurationUtilities
): { earsAuthorizationUrl?: string } => {
  if (oauthConfig.authTypeId === 'oauth_authorization_code') {
    actionsConfigUtils.ensureUriAllowed(oauthConfig.authorizationUrl);
    actionsConfigUtils.ensureUriAllowed(oauthConfig.tokenUrl);
    return {};
  }

  const { authorizeEndpoint } = getEarsEndpointsForProvider(oauthConfig.provider);
  const earsAuthorizationUrl = resolveEarsUrl(authorizeEndpoint, actionsConfigUtils.getEarsUrl());
  actionsConfigUtils.ensureUriAllowed(earsAuthorizationUrl);

  return { earsAuthorizationUrl };
};

/**
 * Initiates OAuth2 Authorization Code flow
 * Returns authorization URL for user to visit
 */
export const oauthAuthorizeRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  logger: Logger,
  coreSetup: CoreSetup<ActionsPluginsStart>,
  oauthRateLimiter: OAuthRateLimiter,
  actionsConfigUtils: ActionsConfigurationUtilities
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/{connectorId}/_start_oauth_flow`,
      security: {
        authz: {
          requiredPrivileges: [OAUTH_API_TAG],
        },
      },
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

          // Verify the connector exists and the user has access via the actions client
          const actionsClient = (await context.actions).getActionsClient();
          await actionsClient.get({ id: connectorId });

          // Check rate limit
          const currentUser = core.security.authc.getCurrentUser();
          if (!currentUser) {
            return res.unauthorized({
              body: {
                message: 'User should be authenticated to initiate OAuth authorization.',
              },
            });
          }
          const { profile_uid } = currentUser;

          if (!profile_uid) {
            return res.customError({
              statusCode: 500,
              body: {
                message: 'Unable to retrieve Kibana user profile ID.',
              },
            });
          }

          oauthRateLimiter.log(profile_uid, 'authorize');
          if (oauthRateLimiter.isRateLimited(profile_uid, 'authorize')) {
            routeLogger.warn(
              `OAuth authorize rate limit exceeded for user: ${profile_uid}, connector: ${connectorId}`
            );
            return res.customError({
              statusCode: 429,
              body: {
                message: 'Too many authorization attempts. Please try again later.',
              },
            });
          }

          const [coreStart, { encryptedSavedObjects, spaces }] = await coreSetup.getStartServices();
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
          });

          const spaceId = spaces ? spaces.spacesService.getSpaceId(req) : 'default';
          let namespace: string | undefined;
          if (spaces && spaceId) {
            namespace = spaces.spacesService.spaceIdToNamespace(spaceId);
          }
          const oauthConfig = await oauthService.getOAuthConfig(connectorId, namespace);

          let earsAuthorizationUrl: string | undefined;
          try {
            ({ earsAuthorizationUrl } = validateOAuthUrlsAreAllowed(
              oauthConfig,
              actionsConfigUtils
            ));
          } catch (allowedHostsErr) {
            const message =
              allowedHostsErr instanceof Error ? allowedHostsErr.message : String(allowedHostsErr);
            return res.badRequest({
              body: {
                message: message || 'OAuth URL is not allowed by xpack.actions.allowedHosts',
              },
            });
          }

          const redirectUri = OAuthAuthorizationService.getRedirectUri(kibanaUrl);

          // Validate return URL for post-OAuth redirect.
          // When not provided, the callback route will render a self-contained
          // HTML page instead of redirecting.
          const requestedReturnUrl = req.body?.returnUrl;
          let kibanaReturnUrl: string | undefined;

          if (requestedReturnUrl) {
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
            kibanaReturnUrl,
            spaceId,
            createdBy: profile_uid,
          });

          let authorizationUrl: string;
          if (oauthConfig.authTypeId === 'ears') {
            if (!earsAuthorizationUrl) {
              throw new Error('EARS authorization URL was not resolved');
            }
            authorizationUrl = oauthService.buildEarsAuthorizationUrl({
              baseAuthorizationUrl: earsAuthorizationUrl,
              scope: oauthConfig.scope,
              callbackUri: redirectUri,
              state: state.state,
              pkceChallenge: codeChallenge,
            });
          } else {
            authorizationUrl = oauthService.buildAuthorizationUrl({
              baseAuthorizationUrl: oauthConfig.authorizationUrl,
              clientId: oauthConfig.clientId,
              scope: oauthConfig.scope,
              redirectUri,
              state: state.state,
              codeChallenge,
            });
          }

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

          logger.error('Failed to initiate OAuth authorization', { error: err });

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

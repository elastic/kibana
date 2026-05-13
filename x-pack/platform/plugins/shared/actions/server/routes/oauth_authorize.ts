/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  IKibanaResponse,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { getEarsEndpointsForProvider, resolveEarsUrl } from '../lib/ears';
import type { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH, INTERNAL_BASE_ACTION_API_PATH } from '../../common';
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

const oauthStartReturnUrlFields = {
  returnUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
};

const startOAuthFlowBodySchema = schema.object(oauthStartReturnUrlFields);
const startOAuthFlowGetQuerySchema = schema.object(oauthStartReturnUrlFields);

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
 * Registers OAuth2 authorization start routes:
 *
 * - **POST** `/internal/actions/connector/{connectorId}/_start_oauth_flow` — JSON `{ authorizationUrl, state }` (internal).
 * - **GET** `/api/actions/connector/{connectorId}/oauth/start` — **302** to the IdP (public).
 *   Absolute link: `{server.publicBaseUrl}/api/actions/connector/{connectorId}/oauth/start`
 *   with optional `?returnUrl=` (https, same origin as Kibana), e.g. for Slack:
 *   `https://my.kibana.example/api/actions/connector/my-id/oauth/start?returnUrl=https://my.kibana.example/app/foo`
 *
 * Both require an authenticated Kibana user with `profile_uid` and the same OAuth privileges.
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
        body: startOAuthFlowBodySchema,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { connectorId } = req.params;

        try {
          const { authorizationUrl, state } = await startOAuthAuthorizationFlow({
            connectorId,
            returnUrl: req.body?.returnUrl,
            context,
            req,
            coreSetup,
            logger,
            oauthRateLimiter,
            actionsConfigUtils,
          });

          return res.ok({
            body: {
              authorizationUrl,
              state,
            },
          });
        } catch (err) {
          return handleOAuthStartError(err, logger, res);
        }
      })
    )
  );

  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{connectorId}/oauth/start`,
      security: {
        authz: {
          requiredPrivileges: [OAUTH_API_TAG],
        },
      },
      validate: {
        params: paramsSchema,
        query: startOAuthFlowGetQuerySchema,
      },
      options: {
        access: 'public',
        summary: 'Start OAuth authorization (redirects to the identity provider)',
        tags: ['oas-tag:connectors'],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { connectorId } = req.params;

        try {
          const { authorizationUrl } = await startOAuthAuthorizationFlow({
            connectorId,
            returnUrl: req.query.returnUrl,
            context,
            req,
            coreSetup,
            logger,
            oauthRateLimiter,
            actionsConfigUtils,
          });

          return res.redirected({
            body: '',
            headers: {
              location: authorizationUrl,
            },
          });
        } catch (err) {
          return handleOAuthStartError(err, logger, res);
        }
      })
    )
  );
};

/**
 * Shared OAuth start logic for POST /internal/.../_start_oauth_flow and
 * GET /api/actions/connector/{connectorId}/oauth/start.
 */
async function startOAuthAuthorizationFlow(params: {
  connectorId: string;
  returnUrl: string | undefined;
  context: ActionsRequestHandlerContext;
  req: KibanaRequest;
  coreSetup: CoreSetup<ActionsPluginsStart>;
  logger: Logger;
  oauthRateLimiter: OAuthRateLimiter;
  actionsConfigUtils: ActionsConfigurationUtilities;
}): Promise<{ authorizationUrl: string; state: string }> {
  const {
    connectorId,
    returnUrl,
    context,
    req,
    coreSetup,
    logger,
    oauthRateLimiter,
    actionsConfigUtils,
  } = params;
  const routeLogger = logger.get('oauth_authorize');

  const actionsClient = (await context.actions).getActionsClient();
  await actionsClient.get({ id: connectorId });

  const core = await context.core;
  const currentUser = core.security.authc.getCurrentUser();
  if (!currentUser) {
    throw Object.assign(
      new Error('User should be authenticated to initiate OAuth authorization.'),
      {
        statusCode: 401,
      }
    );
  }
  const { profile_uid } = currentUser;

  if (!profile_uid) {
    throw Object.assign(new Error('Unable to retrieve Kibana user profile ID.'), {
      statusCode: 500,
    });
  }

  oauthRateLimiter.log(profile_uid, 'authorize');
  if (oauthRateLimiter.isRateLimited(profile_uid, 'authorize')) {
    routeLogger.warn(
      `OAuth authorize rate limit exceeded for user: ${profile_uid}, connector: ${connectorId}`
    );
    throw Object.assign(new Error('Too many authorization attempts. Please try again later.'), {
      statusCode: 429,
    });
  }

  const [coreStart, { encryptedSavedObjects, spaces }] = await coreSetup.getStartServices();
  const kibanaUrl = coreStart.http.basePath.publicBaseUrl;
  if (!kibanaUrl) {
    throw Object.assign(
      new Error('Kibana public URL not configured. Please set server.publicBaseUrl in kibana.yml'),
      { statusCode: 400 }
    );
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
    ({ earsAuthorizationUrl } = validateOAuthUrlsAreAllowed(oauthConfig, actionsConfigUtils));
  } catch (allowedHostsErr) {
    const message =
      allowedHostsErr instanceof Error ? allowedHostsErr.message : String(allowedHostsErr);
    throw Object.assign(
      new Error(message || 'OAuth URL is not allowed by xpack.actions.allowedHosts'),
      { statusCode: 400 }
    );
  }

  const redirectUri = OAuthAuthorizationService.getRedirectUri(kibanaUrl);
  let kibanaReturnUrl: string | undefined;

  if (returnUrl) {
    const returnUrlObj = new URL(returnUrl);
    const kibanaUrlObj = new URL(kibanaUrl);

    if (returnUrlObj.origin !== kibanaUrlObj.origin) {
      throw Object.assign(
        new Error(
          `returnUrl must be same origin as Kibana. Expected: ${kibanaUrlObj.origin}, Got: ${returnUrlObj.origin}`
        ),
        { statusCode: 400 }
      );
    }
    kibanaReturnUrl = returnUrl;
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
      scopeParamName: oauthConfig.scopeParamName,
      redirectUri,
      state: state.state,
      codeChallenge,
    });
  }

  return {
    authorizationUrl,
    state: state.state,
  };
}

function handleOAuthStartError(
  err: unknown,
  logger: Logger,
  res: KibanaResponseFactory
): IKibanaResponse {
  const errorMessage = err instanceof Error ? err.message : String(err);
  const statusCode =
    err instanceof Error && 'statusCode' in err
      ? (err as Error & { statusCode: number }).statusCode
      : 500;

  if (statusCode >= 500) {
    logger.error('Failed to initiate OAuth authorization', {
      error: err instanceof Error ? err : new Error(String(err)),
    });
  }

  if (statusCode === 401) {
    return res.unauthorized({
      body: {
        message: errorMessage || 'Failed to initiate OAuth authorization',
      },
    });
  }

  if (statusCode === 400) {
    return res.badRequest({
      body: {
        message: errorMessage || 'Failed to initiate OAuth authorization',
      },
    });
  }

  return res.customError({
    statusCode,
    body: {
      message: errorMessage || 'Failed to initiate OAuth authorization',
    },
  });
}

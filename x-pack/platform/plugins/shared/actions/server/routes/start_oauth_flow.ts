/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import crypto from 'crypto';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import { DEFAULT_ACTION_ROUTE_SECURITY } from './constants';
import { verifyAccessAndContext } from './verify_access_and_context';
import { OAuthStateClient } from '../lib/oauth_state_client';

const paramsSchema = schema.object({
  connectorId: schema.string(),
});

const bodySchema = schema.object({
  kibanaReturnUrl: schema.string(),
});

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function generateCodeVerifier(): string {
  // 32 bytes => 43 char base64url-ish, within PKCE limits
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
}

function assertSafeReturnUrl(url: string) {
  // prevent open redirects; only allow same-origin relative paths
  if (!url.startsWith('/') || url.includes('://')) {
    throw new Error('Invalid kibanaReturnUrl');
  }
}

interface OAuthConnectorSecrets {
  authorizationUrl?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  scopeQueryParam?: string;
}

interface OAuthConnectorConfig {
  authType?: string;
  auth?: { type?: string };
  authorizationUrl?: string;
  clientId?: string;
  tokenUrl?: string;
  scope?: string;
  scopeQueryParam?: string;
}

export const startOAuthFlowRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  getStartServices: StartServicesAccessor<unknown>
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
        const core = await context.core;
        const { connectorId } = req.params;
        const { kibanaReturnUrl } = req.body;

        try {
          assertSafeReturnUrl(kibanaReturnUrl);

          const [, { encryptedSavedObjects }] = await getStartServices();

          const basePath = core.http.basePath.get(req);
          const proto =
            (req.headers['x-forwarded-proto'] as string | undefined) ?? (req.protocol as string);
          const host =
            (req.headers['x-forwarded-host'] as string | undefined) ??
            (req.headers.host as string | undefined);
          if (!host) {
            throw new Error('Missing Host header');
          }

          const redirectUri = `${proto}://${host}${basePath}${INTERNAL_BASE_ACTION_API_PATH}/connector/_oauth_callback`;

          // Decrypt connector secrets to read OAuth config
          const connectorEncryptedClient = encryptedSavedObjects.getClient({
            includedHiddenTypes: ['action'],
          });
          const rawAction = await connectorEncryptedClient.getDecryptedAsInternalUser<{
            config: OAuthConnectorConfig;
            secrets: OAuthConnectorSecrets;
          }>('action', connectorId);

          const config = rawAction.attributes.config;
          const secrets = rawAction.attributes.secrets;

          const authType = config?.authType ?? config?.auth?.type;
          if (authType !== 'oauth_authorization_code') {
            throw new Error('Connector does not use OAuth Authorization Code flow');
          }

          const authorizationUrl = secrets.authorizationUrl || config.authorizationUrl;
          const clientId = secrets.clientId || config.clientId;
          const scope = secrets.scope || config.scope;
          const scopeQueryParam = secrets.scopeQueryParam || config.scopeQueryParam;

          if (!authorizationUrl || !clientId) {
            throw new Error('Connector missing required OAuth configuration (authorizationUrl, clientId)');
          }

          const state = SavedObjectsUtils.generateId();
          const codeVerifier = generateCodeVerifier();
          const codeChallenge = generateCodeChallenge(codeVerifier);

          const oauthStateClient = new OAuthStateClient({
            encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
              includedHiddenTypes: ['oauth_state'],
            }),
            unsecuredSavedObjectsClient: core.savedObjects.getClient({
              includedHiddenTypes: ['oauth_state'],
            }),
            logger: context.logger.get('oauth_start'),
          });

          await oauthStateClient.create(state, {
            connectorId,
            kibanaReturnUrl,
            redirectUri,
            codeVerifier,
            createdAt: new Date().toISOString(),
          });

          const authUrl = new URL(authorizationUrl);
          authUrl.searchParams.set('client_id', clientId);
          authUrl.searchParams.set('response_type', 'code');
          authUrl.searchParams.set('redirect_uri', redirectUri);
          authUrl.searchParams.set('state', state);
          authUrl.searchParams.set('code_challenge', codeChallenge);
          authUrl.searchParams.set('code_challenge_method', 'S256');
          if (scope) {
            authUrl.searchParams.set(scopeQueryParam ?? 'scope', scope);
          }

          return res.ok({
            body: { authorizationUrl: authUrl.toString() },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return res.badRequest({
            body: { message },
          });
        }
      })
    )
  );
};


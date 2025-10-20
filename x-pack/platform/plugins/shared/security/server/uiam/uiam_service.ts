/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { readFileSync } from 'fs';
import { Agent } from 'undici';

import type { Logger } from '@kbn/core/server';

import { HTTPAuthorizationHeader } from '..';
import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../common/constants';
import type { UiamConfigType } from '../config';
import type { AuthenticationInfo } from '../elasticsearch';
import { getDetailedErrorMessage } from '../errors';
import type { UserProfileGrant } from '../user_profile';

/**
 * Response structure from UIAM _authenticate endpoint
 */
interface UiamAuthenticateResponse {
  type: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string | null;
  contexts: Array<{
    type: string;
    project_id: string;
    project_type: string;
    project_organization_id: string;
    application_roles: string[];
  }> | null;
  credentials: {
    id: string;
    type: 'api-key' | 'token';
    creation: string;
    expiration: string | null;
    internal: boolean;
  };
  token: string | null;
  role_assignments: {
    platform?: unknown[] | null;
    organization?: unknown[] | null;
    deployment?: unknown[] | null;
    project?: Record<string, unknown> | null;
    user?: unknown[] | null;
    cloud_connected?: unknown[] | null;
  } | null;
}

/**
 * The service that integrates with UIAM for user authentication and session management.
 */
export interface UiamServicePublic {
  /**
   * Creates a set of authentication headers used to authenticate user with UIAM service.
   * @param accessToken UIAM session access token.
   */
  getAuthenticationHeaders(accessToken: string): Record<string, string>;

  /**
   * Creates a user profile grant based on the provided access token.
   * @param accessToken UIAM session access token.
   */
  getUserProfileGrant(accessToken: string): UserProfileGrant;

  /**
   * Authenticates the user with UIAM and returns authentication information.
   * @param accessToken UIAM session access token.
   */
  authenticate(accessToken: string): Promise<AuthenticationInfo>;

  /**
   * Refreshes the UIAM user session and returns new access and refresh session tokens.
   * @param refreshToken UIAM session refresh token.
   */
  refreshSessionTokens(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }>;

  /**
   * Invalidates the UIAM user session represented by the provided access and refresh tokens.
   * @param accessToken UIAM session access token.
   * @param refreshToken UIAM session refresh token.
   */
  invalidateSessionTokens(accessToken: string, refreshToken: string): Promise<void>;
}

/**
 * See {@link UiamServicePublic}.
 */
export class UiamService implements UiamServicePublic {
  readonly #logger: Logger;
  readonly #config: Required<UiamConfigType>;
  readonly #dispatcher: Agent | undefined;

  constructor(logger: Logger, config: UiamConfigType) {
    this.#logger = logger;

    // Destructure existing config and re-create it again after validation to make TypeScript can infer the proper types.
    const { enabled, url, sharedSecret, ssl } = config;
    if (!enabled) {
      throw new Error('UIAM is not enabled.');
    }

    if (!url) {
      throw new Error('UIAM URL is not configured.');
    }

    if (!sharedSecret) {
      throw new Error('UIAM shared secret is not configured.');
    }

    this.#config = { enabled, url, sharedSecret, ssl };
    this.#dispatcher = this.#createFetchDispatcher();
  }

  /**
   * See {@link UiamServicePublic.getAuthenticationHeaders}.
   */
  getAuthenticationHeaders(accessToken: string): Record<string, string> {
    return {
      authorization: new HTTPAuthorizationHeader('Bearer', accessToken).toString(),
      [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
    };
  }

  /**
   * See {@link UiamServicePublic.getUserProfileGrant}.
   */
  getUserProfileGrant(accessToken: string): UserProfileGrant {
    return {
      type: 'uiamAccessToken' as const,
      accessToken,
      sharedSecret: this.#config.sharedSecret,
    };
  }

  /**
   * See {@link UiamServicePublic.authenticate}.
   */
  async authenticate(accessToken: string): Promise<AuthenticationInfo> {
    try {
      const response: UiamAuthenticateResponse = await UiamService.#parseUiamResponse(
        await fetch(
          `${
            this.#config.url
          }/uiam/api/v1/authentication/_authenticate?include_role_assignments=true`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              contexts: [
                {
                  project_id: 'abcdef1234567890abcdef1234567890',
                  project_organization_id: '1234567890',
                  project_type: 'observability',
                  type: 'project',
                },
              ],
            }),
            // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
            dispatcher: this.#dispatcher,
          }
        )
      );

      this.#logger.debug(`UIAM Authentication response: ${JSON.stringify(response)}`);

      this.#logger.debug('User successfully authenticated with UIAM.');

      // Extract roles from contexts
      const roles =
        response.contexts?.flatMap(
          (context: {
            type: string;
            project_id: string;
            project_type: string;
            project_organization_id: string;
            application_roles: string[];
          }) => context.application_roles
        ) || [];

      // Map UIAM response to AuthenticationInfo
      return {
        username: response.user_id,
        email: response.email,
        full_name:
          response.first_name || response.last_name
            ? [response.first_name, response.last_name].filter(Boolean).join(' ')
            : undefined,
        roles,
        enabled: true,
        authentication_realm: { name: 'uiam', type: 'uiam' },
        lookup_realm: { name: 'uiam', type: 'uiam' },
        authentication_type: response.credentials.type === 'api-key' ? 'api_key' : 'token',
        metadata: {
          _reserved: false,
        },
        ...(response.credentials.type === 'api-key'
          ? {
              api_key: {
                id: response.credentials.id,
                name: response.credentials.id,
              },
            }
          : {}),
      };
    } catch (err) {
      this.#logger.error(() => `Failed to authenticate user: ${getDetailedErrorMessage(err)}`);

      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.refreshSessionTokens}.
   */
  async refreshSessionTokens(refreshToken: string) {
    try {
      const tokens = await UiamService.#parseUiamResponse(
        await fetch(`${this.#config.url}/uiam/api/v1/tokens/_refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      this.#logger.debug('UIAM tokens successfully refreshed.');

      return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
    } catch (err) {
      this.#logger.error(() => `Failed to refresh session tokens: ${getDetailedErrorMessage(err)}`);

      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.invalidateSessionTokens}.
   */
  async invalidateSessionTokens(accessToken: string, refreshToken: string) {
    try {
      await UiamService.#parseUiamResponse(
        await fetch(`${this.#config.url}/uiam/api/v1/tokens/_invalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ tokens: [accessToken, refreshToken] }),
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      this.#logger.debug('UIAM tokens successfully invalidated.');
    } catch (err) {
      this.#logger.error(
        () => `Failed to invalidate session tokens: ${getDetailedErrorMessage(err)}`
      );

      throw err;
    }
  }

  /**
   * Creates a custom dispatcher for the native `fetch` to use custom TLS connection settings.
   */
  #createFetchDispatcher() {
    const { certificateAuthorities, verificationMode } = this.#config.ssl;

    // Read CA certificate(s) from the file paths defined in the config.
    const ca = certificateAuthorities
      ? (Array.isArray(certificateAuthorities)
          ? certificateAuthorities
          : [certificateAuthorities]
        ).map((caPath) => readFileSync(caPath, 'utf8'))
      : undefined;

    // If we don't have custom CAs and the full verification is required, we don't need custom
    // dispatcher as it's a default `fetch` behavior.
    if (!ca && verificationMode === 'full') {
      return;
    }

    return new Agent({
      connect: {
        ca,
        rejectUnauthorized: verificationMode !== 'none',
        // By default, Node.js is checking the server identity to match SAN/CN in certificate.
        ...(verificationMode === 'certificate' ? { checkServerIdentity: () => undefined } : {}),
      },
    });
  }

  /**
   * Parses the UIAM service response as free-form JSON if it’s a successful response, otherwise throws a Boom error based on the error response from the UIAM service.
   */
  static async #parseUiamResponse(response: Response) {
    if (response.ok) {
      if (response.status === 204) {
        return;
      }

      return await response.json();
    }

    const payload = await response.json();
    const err = new Boom.Boom(payload?.error?.message || 'Unknown error');

    err.output = {
      statusCode: response.status,
      payload,
      headers: Object.fromEntries(response.headers.entries()),
    };

    throw err;
  }
}

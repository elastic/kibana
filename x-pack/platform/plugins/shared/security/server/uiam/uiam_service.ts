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
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import type { UserProfileGrant } from '../user_profile';

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
  getUserProfileGrant(accessToken: string) {
    return {
      type: 'uiamAccessToken' as const,
      accessToken,
      sharedSecret: this.#config.sharedSecret,
    };
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
      return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
    } catch (err) {
      // TODO: Temporarily rethrow all errors as `401` (UIAM service doesn't support token refresh yet).
      this.#logger.error(() => `Failed to refresh session tokens: ${getDetailedErrorMessage(err)}`);
      throw Boom.unauthorized(`UIAM service doesn't support token refresh yet.`);
    }
  }

  /**
   * See {@link UiamServicePublic.invalidateSessionTokens}.
   */
  async invalidateSessionTokens(accessToken: string, refreshToken: string) {
    let invalidatedTokensCount;
    try {
      invalidatedTokensCount = (
        await UiamService.#parseUiamResponse(
          await fetch(`${this.#config.url}/uiam/api/v1/tokens/_invalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ token: accessToken, refresh_token: refreshToken }),
            // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
            dispatcher: this.#dispatcher,
          })
        )
      ).invalidated_tokens;
    } catch (err) {
      this.#logger.error(
        () => `Failed to invalidate session tokens: ${getDetailedErrorMessage(err)}`
      );

      // TODO: Temporarily swallow the 500 errors (UIAM service doesn't support token invalidation yet).
      if (getErrorStatusCode(err) === 500) {
        return;
      }

      throw err;
    }

    if (invalidatedTokensCount === 0) {
      this.#logger.debug('Session tokens were already invalidated.');
    } else if (invalidatedTokensCount === 2) {
      this.#logger.debug('All session tokens were successfully invalidated.');
    } else {
      this.#logger.warn(
        `${invalidatedTokensCount} refresh tokens were invalidated, this is unexpected.`
      );
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

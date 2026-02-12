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
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type {
  ClientAuthentication,
  GrantUiamAPIKeyParams,
} from '@kbn/security-plugin-types-server';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../common/constants';
import type { UiamConfigType } from '../config';
import { getDetailedErrorMessage } from '../errors';

/**
 * Represents the request body for granting an API key via UIAM.
 */
export interface GrantUiamApiKeyRequestBody {
  /** A descriptive name for the API key. */
  description: string;
  /** Indicates whether this is an internal API key. */
  internal: boolean;
  /** Optional expiration time for the API key (e.g., '1d', '7d'). */
  expiration?: string;
  /** Role assignments that define access and resource limits for the API key. */
  role_assignments: {
    /** Limits defining the scope of the API key. */
    limit: {
      /** Access types granted to the API key (e.g., 'application'). */
      access: string[];
      /** Resource types the API key can access (e.g., 'project'). */
      resource: string[];
    };
  };
}

/**
 * Represents the response from granting an API key via UIAM.
 */
export interface GrantUiamApiKeyResponse {
  /** The unique identifier for the API key. */
  id: string;
  /** The API key value (encoded). */
  key: string;
  /** A descriptive name/description for the API key. */
  description: string;
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
   * Returns the Elasticsearch client authentication information with the shared secret value. This is to be used with
   * `client_authentication` option in Elasticsearch client.
   */
  getClientAuthentication(): ClientAuthentication;

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

  /**
   * Grants an API key using the UIAM service.
   * @param authorization The HTTP authorization header containing scheme and credentials.
   * @param params The parameters for creating the API key (name and optional expiration).
   * @returns A promise that resolves to an object containing the API key details.
   */
  grantApiKey(
    authorization: HTTPAuthorizationHeader,
    params: GrantUiamAPIKeyParams
  ): Promise<GrantUiamApiKeyResponse>;

  /**
   * Revokes a UIAM API key by its ID.
   * @param apiKeyId The ID of the API key to revoke.
   * @param apiKey The API key to revoke; will be used for authentication on this request.
   */
  revokeApiKey(apiKeyId: string, apiKey: string): Promise<void>;
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
   * See {@link UiamServicePublic.getClientAuthentication}.
   */
  getClientAuthentication(): ClientAuthentication {
    return { scheme: 'SharedSecret', value: this.#config.sharedSecret };
  }

  /**
   * See {@link UiamServicePublic.refreshSessionTokens}.
   */
  async refreshSessionTokens(refreshToken: string) {
    try {
      this.#logger.debug('Attempting to refresh session tokens.');

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
      this.#logger.error(() => `Failed to refresh session tokens: ${getDetailedErrorMessage(err)}`);

      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.invalidateSessionTokens}.
   */
  async invalidateSessionTokens(accessToken: string, refreshToken: string) {
    try {
      this.#logger.debug('Attempting to invalidate session tokens.');

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

      this.#logger.debug('Successfully invalidated session tokens.');
    } catch (err) {
      this.#logger.error(
        () => `Failed to invalidate session tokens: ${getDetailedErrorMessage(err)}`
      );

      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.grantApiKey}.
   */
  async grantApiKey(authorization: HTTPAuthorizationHeader, params: GrantUiamAPIKeyParams) {
    this.#logger.debug(
      `Attempting to grant API key using authorization scheme: ${authorization.scheme}`
    );

    try {
      const body: GrantUiamApiKeyRequestBody = {
        description: params.name,
        internal: true,
        ...(params.expiration ? { expiration: params.expiration } : {}),
        role_assignments: {
          // currently required  to downscope privileges
          limit: {
            // limit access to applications within projects (i.e. application_roles, not cloud roles)
            access: ['application'],
            // limit access to projects  (i.e. not deployments, organizations, etc.)
            resource: ['project'],
          },
        },
      };

      const response = await UiamService.#parseUiamResponse(
        await fetch(`${this.#config.url}/uiam/api/v1/api-keys/_grant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
            Authorization: authorization.toString(),
          },
          body: JSON.stringify(body),
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      this.#logger.debug(`Successfully granted API key with id ${response.id}`);
      return response;
    } catch (err) {
      this.#logger.error(() => `Failed to grant API key: ${getDetailedErrorMessage(err)}`);

      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.revokeApiKey}.
   */
  async revokeApiKey(apiKeyId: string, apiKey: string): Promise<void> {
    try {
      this.#logger.debug(`Attempting to revoke API key: ${apiKeyId}`);

      await UiamService.#parseUiamResponse(
        await fetch(`${this.#config.url}/uiam/api/v1/api-keys/${apiKeyId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
            Authorization: `ApiKey ${apiKey}`,
          },
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      this.#logger.debug(`Successfully revoked API key: ${apiKeyId}`);
    } catch (err) {
      this.#logger.error(() => `Failed to revoke API key: ${getDetailedErrorMessage(err)}`);

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
        // The applications, including Kibana, running inside the MKI cluster should not need access to things like the
        // root CA and should be able to work with the CAs related to that particular cluster. The trust bundle we
        // currently deploy in the Kibana pods includes only the intermediate CA that is scoped to the application
        // cluster. Therefore, we need to allow partial trust chain validation.
        allowPartialTrustChain: true,
        rejectUnauthorized: verificationMode !== 'none',
        // By default, Node.js is checking the server identity to match SAN/CN in certificate.
        ...(verificationMode === 'certificate' ? { checkServerIdentity: () => undefined } : {}),
      },
    });
  }

  /**
   * Parses the UIAM service response as free-form JSON if it's a successful response, otherwise throws a Boom error based on the error response from the UIAM service.
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

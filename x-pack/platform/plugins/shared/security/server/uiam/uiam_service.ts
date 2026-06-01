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
  CreateUiamOAuthClientParams,
  UiamOAuthClientLogo,
  UiamOAuthClientResponse,
  UiamOAuthClientType,
  UiamOAuthConnectionResponse,
  UpdateUiamOAuthClientParams,
  UpdateUiamOAuthConnectionParams,
} from '@kbn/core-security-server';
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
 * Represents a single key entry in the convert API keys request body.
 */
export interface ConvertUiamApiKeyRequestEntry {
  type: 'elasticsearch';
  key: string;
  endpoint: string;
}

/**
 * Represents the request body for converting API keys via UIAM.
 */
export interface ConvertUiamApiKeysRequestBody {
  keys: ConvertUiamApiKeyRequestEntry[];
}

/**
 * Represents the response from converting API keys via UIAM, containing per-key results.
 */
export interface ConvertUiamApiKeysResponse {
  results: Array<
    | {
        status: 'success';
        id: string;
        key: string;
        description: string;
        organization_id: string;
        internal: boolean;
        role_assignments: Record<string, unknown>;
        creation_date: string;
        expiration_date: string | null;
      }
    | { status: 'failed'; code: string; message: string; resource: string | null; type: string }
  >;
}

export type OAuthClientLogo = UiamOAuthClientLogo;
export type OAuthClientType = UiamOAuthClientType;
export type OAuthClientResponse = UiamOAuthClientResponse;
export type OAuthConnectionResponse = UiamOAuthConnectionResponse;
export type CreateOAuthClientRequestBody = CreateUiamOAuthClientParams;
export type PatchOAuthClientRequestBody = UpdateUiamOAuthClientParams;
export type PatchOAuthConnectionRequestBody = UpdateUiamOAuthConnectionParams;

/**
 * Shape of the `error` object inside a UIAM non-2xx response payload, mirroring
 * UIAM's `ErrorDetails` schema. All fields are optional per the UIAM contract.
 * @see https://github.com/elastic/uiam/blob/main/api/openapi.yaml
 */
interface UiamErrorDetails {
  code?: string;
  message?: string;
  resource?: string;
  type?: string;
}

/**
 * Response containing a list of OAuth clients.
 */
export interface OAuthClientsResponse {
  clients: OAuthClientResponse[];
}

/**
 * Response containing a list of OAuth connections.
 */
export interface OAuthConnectionsResponse {
  connections: OAuthConnectionResponse[];
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
   * Exchanges an OAuth access token for an ephemeral UIAM token. Validates that the audience
   * returned by UIAM matches the expected Kibana server audience and throws if there is a mismatch.
   * @param accessToken The OAuth access token.
   * @returns The ephemeral token.
   */
  exchangeOAuthToken(accessToken: string): Promise<string>;

  /**
   * Revokes a UIAM API key by its ID.
   * @param apiKeyId The ID of the API key to revoke.
   * @param apiKey The API key to revoke; will be used for authentication on this request.
   */
  revokeApiKey(apiKeyId: string, apiKey: string): Promise<void>;

  /**
   * Converts Elasticsearch API keys into UIAM API keys. The Elasticsearch endpoint is injected
   * automatically from the cloud.id configuration.
   * @param keys The base64-encoded Elasticsearch API key values to convert.
   * @returns A promise that resolves to a response containing per-key success/failure results.
   */
  convertApiKeys(keys: string[]): Promise<ConvertUiamApiKeysResponse>;

  /**
   * Creates an OAuth client via the UIAM service.
   * @param accessToken UIAM session access token.
   * @param body The request body for creating the OAuth client.
   */
  createOAuthClient(
    accessToken: string,
    body: CreateOAuthClientRequestBody
  ): Promise<OAuthClientResponse>;

  /**
   * Lists OAuth clients via the UIAM service.
   * @param accessToken UIAM session access token.
   * @param clientId Optional client ID filter.
   */
  listOAuthClients(accessToken: string, clientId?: string): Promise<OAuthClientsResponse>;

  /**
   * Updates an OAuth client's metadata via the UIAM service.
   * @param accessToken UIAM session access token.
   * @param clientId The ID of the client to update.
   * @param body The request body for updating the OAuth client.
   */
  updateOAuthClient(
    accessToken: string,
    clientId: string,
    body: PatchOAuthClientRequestBody
  ): Promise<OAuthClientResponse>;

  /**
   * Revokes an OAuth client via the UIAM service.
   * @param accessToken UIAM session access token.
   * @param clientId The ID of the client to revoke.
   * @param reason Optional reason for revocation.
   */
  revokeOAuthClient(
    accessToken: string,
    clientId: string,
    reason?: string
  ): Promise<OAuthClientResponse>;

  /**
   * Lists OAuth connections via the UIAM service.
   * @param accessToken UIAM session access token.
   * @param clientId Optional client ID filter.
   * @param connectionId Optional connection ID filter.
   */
  listOAuthConnections(
    accessToken: string,
    clientId?: string,
    connectionId?: string
  ): Promise<OAuthConnectionsResponse>;

  /**
   * Updates an OAuth connection's display name via the UIAM service.
   * @param accessToken UIAM session access token.
   * @param clientId The ID of the client owning the connection.
   * @param connectionId The ID of the connection to update.
   * @param body The request body for updating the OAuth connection.
   */
  updateOAuthConnection(
    accessToken: string,
    clientId: string,
    connectionId: string,
    body: PatchOAuthConnectionRequestBody
  ): Promise<OAuthConnectionResponse>;

  /**
   * Revokes an OAuth connection via the UIAM service.
   * @param accessToken UIAM session access token.
   * @param clientId The ID of the client owning the connection.
   * @param connectionId The ID of the connection to revoke.
   * @param reason Optional reason for revocation.
   */
  revokeOAuthConnection(
    accessToken: string,
    clientId: string,
    connectionId: string,
    reason?: string
  ): Promise<OAuthConnectionResponse>;
}

interface UiamServiceOptions {
  /** The base URL of the Kibana server. */
  kibanaServerURL: string;
  /** The URL of the Elasticsearch cluster. */
  elasticsearchUrl?: string;
}

/**
 * See {@link UiamServicePublic}.
 */
export class UiamService implements UiamServicePublic {
  readonly #logger: Logger;
  readonly #config: Required<UiamConfigType>;
  readonly #dispatcher: Agent | undefined;
  readonly #kibanaServerURL: string;
  readonly #elasticsearchUrl?: string;

  constructor(logger: Logger, config: UiamConfigType, options: UiamServiceOptions) {
    this.#logger = logger;
    this.#kibanaServerURL = options.kibanaServerURL;
    this.#elasticsearchUrl = options.elasticsearchUrl;

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
   * See {@link UiamServicePublic.exchangeOAuthToken}.
   */
  async exchangeOAuthToken(accessToken: string): Promise<string> {
    this.#logger.debug('Attempting to exchange OAuth access token for ephemeral token.');

    // Temporary workaround for https://github.com/elastic/cp-iam-team/issues/2697
    const expectedAudience = this.#kibanaServerURL.endsWith('/')
      ? this.#kibanaServerURL
      : `${this.#kibanaServerURL}/`;
    const url = new URL(`${this.#config.url}/uiam/api/v1/authentication/_authenticate`);
    url.searchParams.set('include_token', 'true');
    url.searchParams.set('audience', expectedAudience);

    try {
      const response = await UiamService.#parseUiamResponse(
        await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
            Authorization: `Bearer ${accessToken}`,
          },
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      const audience = response.credentials?.oauth?.audience;
      if (audience !== expectedAudience) {
        throw Boom.badRequest(
          `OAuth token audience mismatch: expected "${expectedAudience}" but got "${audience}".`
        );
      }

      return response.token;
    } catch (err) {
      this.#logger.error(
        () => `Failed to exchange OAuth access token: ${getDetailedErrorMessage(err)}`
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
   * See {@link UiamServicePublic.convertApiKeys}.
   */
  async convertApiKeys(keys: string[]): Promise<ConvertUiamApiKeysResponse> {
    if (!this.#elasticsearchUrl) {
      throw new Error(
        'Cannot convert API keys: Elasticsearch URL could not be resolved from cloud.id'
      );
    }

    try {
      this.#logger.debug(`Attempting to convert ${keys.length} API key(s).`);

      const body: ConvertUiamApiKeysRequestBody = {
        keys: keys.map((key) => ({
          type: 'elasticsearch' as const,
          key,
          endpoint: this.#elasticsearchUrl!,
        })),
      };

      const response = await UiamService.#parseUiamResponse(
        await fetch(`${this.#config.url}/uiam/api/v1/api-keys/_convert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
          },
          body: JSON.stringify(body),
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      this.#logger.debug(`Successfully converted API key(s).`);
      return response;
    } catch (err) {
      this.#logger.error(() => `Failed to convert API keys: ${getDetailedErrorMessage(err)}`);

      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.createOAuthClient}.
   */
  async createOAuthClient(
    accessToken: string,
    body: CreateOAuthClientRequestBody
  ): Promise<OAuthClientResponse> {
    try {
      this.#logger.debug('Attempting to create OAuth client.');

      const response = await UiamService.#parseUiamResponse(
        await fetch(`${this.#config.url}/uiam/api/v1/oauth/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      this.#logger.debug(`Successfully created OAuth client with id ${response.id}`);
      return response;
    } catch (err) {
      this.#logger.error(() => `Failed to create OAuth client: ${getDetailedErrorMessage(err)}`);
      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.listOAuthClients}.
   */
  async listOAuthClients(accessToken: string, clientId?: string): Promise<OAuthClientsResponse> {
    try {
      this.#logger.debug('Attempting to list OAuth clients.');

      const url = new URL(`${this.#config.url}/uiam/api/v1/oauth/clients`);
      if (clientId) {
        url.searchParams.set('client_id', clientId);
      }

      const response = await UiamService.#parseUiamResponse(
        await fetch(url.toString(), {
          method: 'GET',
          headers: {
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
            Authorization: `Bearer ${accessToken}`,
          },
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      this.#logger.debug('Successfully listed OAuth clients.');
      return response;
    } catch (err) {
      this.#logger.error(() => `Failed to list OAuth clients: ${getDetailedErrorMessage(err)}`);
      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.updateOAuthClient}.
   */
  async updateOAuthClient(
    accessToken: string,
    clientId: string,
    body: PatchOAuthClientRequestBody
  ): Promise<OAuthClientResponse> {
    try {
      this.#logger.debug(`Attempting to update OAuth client: ${clientId}`);

      const response = await UiamService.#parseUiamResponse(
        await fetch(
          `${this.#config.url}/uiam/api/v1/oauth/clients/${encodeURIComponent(clientId)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body),
            // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
            dispatcher: this.#dispatcher,
          }
        )
      );

      this.#logger.debug(`Successfully updated OAuth client: ${clientId}`);
      return response;
    } catch (err) {
      this.#logger.error(
        () => `Failed to update OAuth client ${clientId}: ${getDetailedErrorMessage(err)}`
      );
      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.revokeOAuthClient}.
   */
  async revokeOAuthClient(
    accessToken: string,
    clientId: string,
    reason?: string
  ): Promise<OAuthClientResponse> {
    try {
      this.#logger.debug(`Attempting to revoke OAuth client: ${clientId}`);

      const response = await UiamService.#parseUiamResponse(
        await fetch(
          `${this.#config.url}/uiam/api/v1/oauth/clients/${encodeURIComponent(clientId)}/_revoke`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ reason }),
            // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
            dispatcher: this.#dispatcher,
          }
        )
      );

      this.#logger.debug(`Successfully revoked OAuth client: ${clientId}`);
      return response;
    } catch (err) {
      this.#logger.error(
        () => `Failed to revoke OAuth client ${clientId}: ${getDetailedErrorMessage(err)}`
      );
      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.listOAuthConnections}.
   */
  async listOAuthConnections(
    accessToken: string,
    clientId?: string,
    connectionId?: string
  ): Promise<OAuthConnectionsResponse> {
    try {
      this.#logger.debug('Attempting to list OAuth connections.');

      const url = new URL(`${this.#config.url}/uiam/api/v1/oauth/connections`);
      if (clientId) {
        url.searchParams.set('client_id', clientId);
      }
      if (connectionId) {
        url.searchParams.set('connection_id', connectionId);
      }

      const response = await UiamService.#parseUiamResponse(
        await fetch(url.toString(), {
          method: 'GET',
          headers: {
            [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
            Authorization: `Bearer ${accessToken}`,
          },
          // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
          dispatcher: this.#dispatcher,
        })
      );

      this.#logger.debug('Successfully listed OAuth connections.');
      return response;
    } catch (err) {
      this.#logger.error(() => `Failed to list OAuth connections: ${getDetailedErrorMessage(err)}`);
      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.updateOAuthConnection}.
   */
  async updateOAuthConnection(
    accessToken: string,
    clientId: string,
    connectionId: string,
    body: PatchOAuthConnectionRequestBody
  ): Promise<OAuthConnectionResponse> {
    try {
      this.#logger.debug(`Attempting to update OAuth connection: ${connectionId}`);

      const response = await UiamService.#parseUiamResponse(
        await fetch(
          `${this.#config.url}/uiam/api/v1/oauth/clients/${encodeURIComponent(
            clientId
          )}/connections/${encodeURIComponent(connectionId)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body),
            // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
            dispatcher: this.#dispatcher,
          }
        )
      );

      this.#logger.debug(`Successfully updated OAuth connection: ${connectionId}`);
      return response;
    } catch (err) {
      this.#logger.error(
        () => `Failed to update OAuth connection ${connectionId}: ${getDetailedErrorMessage(err)}`
      );
      throw err;
    }
  }

  /**
   * See {@link UiamServicePublic.revokeOAuthConnection}.
   */
  async revokeOAuthConnection(
    accessToken: string,
    clientId: string,
    connectionId: string,
    reason?: string
  ): Promise<OAuthConnectionResponse> {
    try {
      this.#logger.debug(`Attempting to revoke OAuth connection: ${connectionId}`);

      const response = await UiamService.#parseUiamResponse(
        await fetch(
          `${this.#config.url}/uiam/api/v1/oauth/clients/${encodeURIComponent(
            clientId
          )}/connections/${encodeURIComponent(connectionId)}/_revoke`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [ES_CLIENT_AUTHENTICATION_HEADER]: this.#config.sharedSecret,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ reason }),
            // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
            dispatcher: this.#dispatcher,
          }
        )
      );

      this.#logger.debug(`Successfully revoked OAuth connection: ${connectionId}`);
      return response;
    } catch (err) {
      this.#logger.error(
        () => `Failed to revoke OAuth connection ${connectionId}: ${getDetailedErrorMessage(err)}`
      );
      throw err;
    }
  }

  /**
   * Creates a custom dispatcher for the native `fetch` to use custom TLS connection settings.
   */
  #createFetchDispatcher() {
    const { certificateAuthorities, verificationMode } = this.#config.ssl;

    const readFile = (file: string) => readFileSync(file, 'utf8');

    // Read client certificate and key for mTLS from PEM files.
    const cert = this.#config.ssl.certificate ? readFile(this.#config.ssl.certificate) : undefined;
    const key = this.#config.ssl.key ? readFile(this.#config.ssl.key) : undefined;

    // Read CA certificate(s) from the file paths defined in the config.
    const ca = certificateAuthorities
      ? (Array.isArray(certificateAuthorities)
          ? certificateAuthorities
          : [certificateAuthorities]
        ).map((caPath) => readFile(caPath))
      : undefined;

    // If we don't have any custom TLS settings and the full verification is required, we don't
    // need a custom dispatcher as it's the default `fetch` behavior.
    if (!ca && !cert && !key && verificationMode === 'full') {
      return;
    }

    return new Agent({
      connect: {
        ca,
        cert,
        key,
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
   * Parses the UIAM service response as free-form JSON if it's a successful response, otherwise
   * throws a Boom error derived from UIAM's {@link https://github.com/elastic/uiam/blob/main/api/openapi.yaml ErrorDetails}
   * payload (`{ code, message, resource, type }`). The full payload is preserved on
   * `err.output.payload` so downstream loggers pick up the additional context via
   * {@link getDetailedErrorMessage}.
   */
  static async #parseUiamResponse(response: Response) {
    if (response.ok) {
      if (response.status === 204) {
        return;
      }

      return await response.json();
    }

    const payload = await response.json();
    const { code, message, resource, type }: UiamErrorDetails = payload?.error ?? {};

    // Build a compact, greppable summary for log output: `[code/type] message (resource: ...)`.
    const qualifiers: string[] = [];
    if (code) qualifiers.push(code);
    if (type) qualifiers.push(type);
    const prefix = qualifiers.length > 0 ? `[${qualifiers.join('/')}] ` : '';
    const suffix = resource ? ` (resource: ${resource})` : '';
    const summary = `${prefix}${message ?? 'Unknown error'}${suffix}`;

    const err = new Boom.Boom(summary);

    err.output = {
      statusCode: response.status,
      payload,
      headers: Object.fromEntries(response.headers.entries()),
    };

    throw err;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  GrantAPIKeyResult,
  GrantUiamAPIKeyParams,
  InvalidateAPIKeyResult,
} from '@kbn/security-plugin-types-server';

import type { SecurityLicense } from '../../../../common';
import type { UiamServicePublic } from '../../../uiam';
import { HTTPAuthorizationHeader } from '../../http_authentication';

/**
 * Options required to construct a UiamAPIKeys instance.
 */
export interface UiamAPIKeysOptions {
  logger: Logger;
  clusterClient: IClusterClient;
  license: SecurityLicense;
  uiam: UiamServicePublic;
}

/**
 * Class responsible for managing UIAM-specific API key operations.
 * This class handles API key grants and invalidations through the UIAM service.
 */
export class UiamAPIKeys {
  private readonly logger: Logger;
  private readonly clusterClient: IClusterClient;
  private readonly license: SecurityLicense;
  private readonly uiam: UiamServicePublic;

  constructor({ logger, clusterClient, license, uiam }: UiamAPIKeysOptions) {
    this.logger = logger;
    this.clusterClient = clusterClient;
    this.license = license;
    this.uiam = uiam;
  }

  /**
   * Grants an API key via the UIAM service.
   *
   * @param authorization The HTTP authorization header containing the authentication credentials.
   * @param params The parameters for creating the API key (name and optional expiration).
   * @returns A promise that resolves to a GrantAPIKeyResult object containing the API key details.
   * @throws {Error} If the UIAM service is not available.
   */
  async grantApiKey(
    authorization: HTTPAuthorizationHeader,
    params: GrantUiamAPIKeyParams
  ): Promise<GrantAPIKeyResult> {
    this.logger.debug('Trying to grant an API key via UIAM');
    this.logger.debug(`Using authorization scheme: ${authorization.scheme}`);

    let result: GrantAPIKeyResult;

    // If credentials don't start with 'essu_', reuse the existing API key
    if (!authorization.credentials.startsWith('essu_')) {
      result = {
        id: 'same_api_key_id',
        name: params.name,
        api_key: authorization.credentials,
      };
    } else {
      try {
        const { id, key, description } = await this.uiam.grantApiKey(
          authorization,
          params.name,
          params.expiration
        );

        result = {
          id,
          name: description,
          api_key: key,
        };

        this.logger.debug('API key was granted successfully via UIAM');
      } catch (e) {
        this.logger.error(`Failed to grant API key via UIAM: ${e.message}`);
        throw e;
      }
    }

    return result;
  }

  /**
   * Invalidates an API key via the UIAM service.
   *
   * @param request The Kibana request instance containing the authorization header.
   * @param apiKeyId The ID of the API key to invalidate.
   * @returns A promise that resolves to an InvalidateAPIKeyResult object indicating the result of the operation.
   * @throws {Error} If the license is not enabled or if the request does not contain an authorization header.
   */
  async invalidateApiKey(
    request: KibanaRequest,
    apiKeyId: string
  ): Promise<InvalidateAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug(`Trying to invalidate API key ${apiKeyId} via UIAM`);

    // Extract the API key from the authorization header for authentication
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    if (authorizationHeader == null) {
      throw new Error(
        `Unable to invalidate API key via UIAM, request does not contain an authorization header`
      );
    }

    const apiKey = authorizationHeader.credentials;

    try {
      await this.uiam.revokeApiKey(apiKeyId, apiKey);

      this.logger.debug(`API key ${apiKeyId} was invalidated successfully via UIAM`);

      return {
        invalidated_api_keys: [apiKeyId],
        previously_invalidated_api_keys: [],
        error_count: 0,
      };
    } catch (e) {
      this.logger.error(`Failed to invalidate API key ${apiKeyId} via UIAM: ${e.message}`);

      return {
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [
          {
            type: 'exception',
            reason: e.message,
          },
        ],
      };
    }
  }

  /**
   * Creates a scoped Elasticsearch client with UIAM authentication headers.
   *
   * This method checks if the request contains UIAM credentials (starting with 'essu_')
   * and if so, creates a scoped client with the appropriate UIAM authentication headers.
   * Otherwise, it returns a standard scoped client.
   *
   * @param request The Kibana request instance.
   * @returns A scoped cluster client configured with UIAM authentication headers if applicable.
   * @throws {Error} If the request does not contain an authorization header.
   */
  getScopedClusterClient(request: KibanaRequest) {
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    if (authorizationHeader == null) {
      throw new Error(
        `Unable to create scoped client, request does not contain an authorization header`
      );
    }

    if (authorizationHeader.credentials.startsWith('essu_')) {
      const uiamHeaders = this.uiam.getEsClientAuthenticationHeader();

      return this.clusterClient.asScoped({
        ...request,
        headers: {
          ...request.headers,
          ...uiamHeaders,
        },
      });
    } else {
      return this.clusterClient.asScoped(request);
    }
  }

  /**
   * Checks if the given authorization credentials are UIAM credentials.
   *
   * @param authorization The HTTP authorization header to check.
   * @returns True if the credentials start with 'essu_', false otherwise.
   */
  static isUiamCredential(authorization: HTTPAuthorizationHeader): boolean {
    return authorization.credentials.startsWith('essu_');
  }

  /**
   * Checks if the request contains UIAM credentials.
   *
   * @param request The Kibana request instance.
   * @returns True if the request contains UIAM credentials, false otherwise.
   */
  static hasUiamCredentials(request: KibanaRequest): boolean {
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    return authorizationHeader != null && this.isUiamCredential(authorizationHeader);
  }
}

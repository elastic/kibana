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
  InvalidateUiamAPIKeyParams,
  UiamAPIKeys as UiamAPIKeysType,
} from '@kbn/security-plugin-types-server';

import type { SecurityLicense } from '../../../../common';
import type { UiamServicePublic } from '../../../uiam';
import { HTTPAuthorizationHeader } from '../../http_authentication';

const UIAM_CREDENTIALS_PREFIX = 'essu_';

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
export class UiamAPIKeys implements UiamAPIKeysType {
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
   * @param request
   * @param params The parameters for creating the API key (name and optional expiration).
   * @returns A promise that resolves to a GrantAPIKeyResult object containing the API key details.
   * @throws {Error} If the UIAM service is not available.
   */
  async grantApiKey(
    request: KibanaRequest,
    params: GrantUiamAPIKeyParams
  ): Promise<GrantAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const authorization = UiamAPIKeys.getAuthorizationHeader(request);

    this.logger.debug('Trying to grant an API key via UIAM');
    this.logger.debug(`Using authorization scheme: ${authorization.scheme}`);

    let result: GrantAPIKeyResult;

    // If credentials don't start with UIAM_CREDENTIALS_PREFIX, reuse the existing API key
    if (!UiamAPIKeys.isUiamCredential(authorization)) {
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
   * @param params
   * @returns A promise that resolves to an InvalidateAPIKeyResult object indicating the result of the operation.
   * @throws {Error} If the license is not enabled or if the request does not contain an authorization header.
   */
  async invalidateApiKey(
    request: KibanaRequest,
    params: InvalidateUiamAPIKeyParams
  ): Promise<InvalidateAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const authorization = UiamAPIKeys.getAuthorizationHeader(request);
    const { id } = params;

    this.logger.debug(`Trying to invalidate API key ${id} via UIAM`);

    if (!UiamAPIKeys.isUiamCredential(authorization)) {
      throw new Error('Cannot invalidate API key via UIAM: not a UIAM API key');
    }

    try {
      await this.uiam.revokeApiKey(id, authorization.credentials);

      this.logger.debug(`API key ${id} was invalidated successfully via UIAM`);

      return {
        invalidated_api_keys: [id],
        previously_invalidated_api_keys: [],
        error_count: 0,
      };
    } catch (e) {
      this.logger.error(`Failed to invalidate API key ${id} via UIAM: ${e.message}`);

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
   * Creates a scoped Elasticsearch client authenticated with an API key.
   *
   * This method creates a scoped cluster client that authenticates using the provided API key.
   * If the API key is a UIAM credential (starts with 'essu_'), it adds the appropriate UIAM
   * authentication headers.
   *
   * @param apiKey The API key secret.
   * @returns A scoped cluster client configured with API key authentication.
   */
  getScopedClusterClientWithApiKey(apiKey: string) {
    if (!this.license.isEnabled()) {
      return null;
    }

    // Create authorization header in the format: ApiKey base64(id:key)
    const authorizationHeader = `ApiKey ${apiKey}`;

    // Check if this is a UIAM credential
    const isUiam = apiKey.startsWith(UIAM_CREDENTIALS_PREFIX);

    if (isUiam) {
      const uiamHeaders = this.uiam.getEsClientAuthenticationHeader();

      return this.clusterClient.asScoped({
        headers: {
          authorization: authorizationHeader,
          ...uiamHeaders,
        },
      });
    } else {
      return this.clusterClient.asScoped({
        headers: {
          authorization: authorizationHeader,
        },
      });
    }
  }

  /**
   * Checks if the given authorization credentials are UIAM credentials.
   *
   * @param authorization The HTTP authorization header to check.
   * @returns True if the credentials start with UIAM_CREDENTIALS_PREFIX, false otherwise.
   */
  static isUiamCredential(authorization: HTTPAuthorizationHeader): boolean {
    return authorization.credentials.startsWith(UIAM_CREDENTIALS_PREFIX);
  }

  /**
   * Checks if the request contains UIAM credentials.
   *
   * @param request The Kibana request instance.
   * @returns True if the request contains UIAM credentials, false otherwise.
   */
  static getAuthorizationHeader(request: KibanaRequest): HTTPAuthorizationHeader {
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);

    if (!authorizationHeader) {
      throw new Error(
        `Unable to determine if request has UIAM credentials, request does not contain an authorization header`
      );
    }

    return authorizationHeader;
  }
}

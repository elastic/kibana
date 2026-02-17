/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import type {
  GrantAPIKeyResult,
  GrantUiamAPIKeyParams,
  InvalidateAPIKeyResult,
  InvalidateUiamAPIKeyParams,
  UiamAPIKeysType,
} from '@kbn/security-plugin-types-server';

import type { SecurityLicense } from '../../../../common';
import { getDetailedErrorMessage } from '../../../errors';
import type { UiamServicePublic } from '../../../uiam';

/**
 * Options required to construct a UiamAPIKeys instance.
 */
export interface UiamAPIKeysOptions {
  logger: Logger;
  license: SecurityLicense;
  uiam: UiamServicePublic;
}

/**
 * Class responsible for managing UIAM-specific API key operations.
 * This class handles API key grants and invalidations through the UIAM service.
 */
export class UiamAPIKeys implements UiamAPIKeysType {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly uiam: UiamServicePublic;

  constructor({ logger, license, uiam }: UiamAPIKeysOptions) {
    this.logger = logger;
    this.license = license;
    this.uiam = uiam;
  }

  /**
   * Grants an API key via the UIAM service.
   *
   * @param request The Kibana request instance containing the authorization header.
   * @param params The parameters for creating the API key (name and optional expiration).
   * @returns A promise that resolves to a GrantAPIKeyResult object containing the API key details, or null if the license is not enabled.
   * @throws {Error} If the request does not contain an authorization header or if the credential is not a UIAM credential.
   */
  async grant(
    request: KibanaRequest,
    params: GrantUiamAPIKeyParams
  ): Promise<GrantAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const authorization = UiamAPIKeys.getAuthorizationHeader(request);

    this.logger.debug('Trying to grant an API key');
    this.logger.debug(`Using authorization scheme: ${authorization.scheme}`);

    let result: GrantAPIKeyResult;

    // Provided credential must be a UIAM credential with appropriate prefix
    if (!isUiamCredential(authorization)) {
      const nonUiamCredentialError =
        'Cannot grant API key: provided credential is not compatible with UIAM';
      this.logger.error(nonUiamCredentialError);
      throw new Error(nonUiamCredentialError);
    }

    try {
      const { id, key, description } = await this.uiam?.grantApiKey(authorization, params);

      result = {
        id,
        name: description,
        api_key: key,
      };

      this.logger.debug('API key was granted successfully');
    } catch (e) {
      this.logger.error(`Failed to grant API key: ${getDetailedErrorMessage(e)}`);
      throw e;
    }

    return result;
  }

  /**
   * Invalidates an API key via the UIAM service.
   *
   * @param request The Kibana request instance containing the authorization header.
   * @param params The parameters containing the ID of the API key to invalidate.
   * @returns A promise that resolves to an InvalidateAPIKeyResult object indicating the result of the operation, or null if the license is not enabled.
   * @throws {Error} If the request does not contain an authorization header or if the credential is not a UIAM credential.
   */
  async invalidate(
    request: KibanaRequest,
    params: InvalidateUiamAPIKeyParams
  ): Promise<InvalidateAPIKeyResult | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const authorization = UiamAPIKeys.getAuthorizationHeader(request);
    const { id } = params;

    this.logger.debug(`Trying to invalidate API key ${id}`);

    if (!isUiamCredential(authorization)) {
      const uiamCredentialError = 'Cannot invalidate API key: not a UIAM API key';
      this.logger.error(uiamCredentialError);
      throw new Error(uiamCredentialError);
    }

    try {
      await this.uiam?.revokeApiKey(id, authorization.credentials);

      this.logger.debug(`API key ${id} was invalidated successfully`);

      return {
        invalidated_api_keys: [id],
        previously_invalidated_api_keys: [],
        error_count: 0,
      };
    } catch (e) {
      const errorMessage = `Failed to invalidate API key ${id}: ${getDetailedErrorMessage(e)}`;
      this.logger.error(errorMessage);

      return {
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [
          {
            type: 'exception',
            reason: errorMessage,
          },
        ],
      };
    }
  }

  /**
   * Extracts and returns the authorization header from the request.
   *
   * @param request The Kibana request instance.
   * @returns The HTTP authorization header extracted from the request.
   * @throws {Error} If the request does not contain an authorization header.
   */
  static getAuthorizationHeader(request: KibanaRequest) {
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);

    if (!authorizationHeader) {
      throw new Error(
        `Unable to determine if request has UIAM credentials, request does not contain an authorization header`
      );
    }

    return authorizationHeader;
  }
}

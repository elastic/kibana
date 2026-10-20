/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { timingSafeEqual } from 'crypto';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  HTTPAuthorizationHeader,
  isExternalUiamCredential,
  isUiamCredential,
} from '@kbn/core-security-server';
import type {
  ConvertUiamAPIKeysResponse,
  GrantAPIKeyResult,
  GrantUiamAPIKeyParams,
  InvalidateAPIKeyResult,
  InvalidateUiamAPIKeyParams,
  UiamAPIKeysType,
} from '@kbn/security-plugin-types-server';

import type { SecurityLicense } from '../../../../common';
import { getDetailedErrorMessage } from '../../../errors';
import { type UiamServicePublic, isExternalApiKey as userHasExternalApiKey } from '../../../uiam';
import { getUiamClientAuthentication } from '../../../uiam/get_client_authentication';
import type { APIKeyAuthenticator, RequestCredentials } from '../../authenticator';
import { isTokenExpiredError } from '../../is_token_expired_error';
import { toServiceAccountGrantError } from '../service_account_grant_error';

/**
 * Options required to construct a UiamAPIKeys instance.
 */
export interface UiamAPIKeysOptions {
  logger: Logger;
  license: SecurityLicense;
  uiam: UiamServicePublic;
  authenticator: APIKeyAuthenticator;
}

/**
 * Class responsible for managing UIAM-specific API key operations.
 * This class handles API key grants and invalidations through the UIAM service.
 */
export class UiamAPIKeys implements UiamAPIKeysType {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly uiam: UiamServicePublic;
  private readonly authenticator: APIKeyAuthenticator;

  constructor({ logger, license, uiam, authenticator }: UiamAPIKeysOptions) {
    this.logger = logger;
    this.license = license;
    this.uiam = uiam;
    this.authenticator = authenticator;
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

    const credentials = this.authenticator.getRequestCredentials(request);
    if (!credentials) {
      throw new Error(
        'Unable to determine if request has UIAM credentials, request does not contain an authorization header'
      );
    }

    this.logger.debug('Trying to grant an API key');
    this.logger.debug(`Using authorization scheme: ${credentials.authorizationHeader.scheme}`);

    // Provided credential must be a UIAM credential with appropriate prefix
    if (!isUiamCredential(credentials.authorizationHeader)) {
      const nonUiamCredentialError =
        'Cannot grant API key: provided credential is not compatible with UIAM';
      this.logger.error(nonUiamCredentialError);
      throw new Error(nonUiamCredentialError);
    }

    try {
      const result = await this.grantWithReauthentication(request, credentials, params);
      this.logger.debug('API key was granted successfully');
      return result;
    } catch (error) {
      const serviceAccountError = toServiceAccountGrantError(
        error,
        this.authenticator.getCurrentUser(request)
      );
      // A refused service account is the caller's to fix, not a Kibana failure.
      this.logger[serviceAccountError ? 'warn' : 'error'](
        `Failed to grant API key: ${getDetailedErrorMessage(error)}`
      );
      throw serviceAccountError ?? error;
    }
  }

  /**
   * Grants with the current UIAM credential and permits one reauthentication after token expiry.
   * @param request The original incoming request that owns the session and any external-key marker.
   * @param credentials The credential snapshot used by the first attempt.
   * @param params Credential-independent API-key settings, reused for both attempts.
   */
  private async grantWithReauthentication(
    request: KibanaRequest,
    credentials: RequestCredentials,
    params: GrantUiamAPIKeyParams
  ): Promise<GrantAPIKeyResult> {
    const grantOnce = async (currentCredentials: RequestCredentials) => {
      const { id, key, description } = await this.uiam.grantApiKey(
        currentCredentials.authorizationHeader,
        params,
        this.isExternalApiKey(request)
          ? null
          : getUiamClientAuthentication({ headers: currentCredentials.authHeaders })
      );
      return { id, name: description, api_key: key };
    };

    try {
      return await grantOnce(credentials);
    } catch (error) {
      if (!isTokenExpiredError(error)) {
        throw error;
      }

      const renewedCredentials = await this.authenticator.reauthenticate(
        request,
        credentials.authHeaders
      );
      if (!renewedCredentials) {
        throw error;
      }

      // Reauthentication validates the replacement credential. Retrying another expiry could loop
      // indefinitely on a broken session, so a second failure must reach the normal error handler.
      return grantOnce(renewedCredentials);
    }
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
      await this.uiam?.revokeApiKey(request, id);

      this.logger.debug(`API key ${id} was invalidated successfully`);

      return {
        invalidated_api_keys: [id],
        previously_invalidated_api_keys: [],
        error_count: 0,
      };
    } catch (e) {
      const errorMessage = `Failed to invalidate API key ${id}: ${getDetailedErrorMessage(e)}`;
      this.logger.error(errorMessage);

      const code = Boom.isBoom(e)
        ? (e.output.payload as Record<string, any>)?.error?.code
        : undefined;

      return {
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [
          {
            type: 'exception',
            reason: errorMessage,
            ...(code ? { code } : {}),
          },
        ],
      };
    }
  }

  /**
   * Converts Elasticsearch API keys into UIAM API keys.
   *
   * @param keys Array containing the keys to convert.
   * @returns A promise that resolves to a response containing per-key success/failure results, or null if the license is not enabled.
   */
  async convert(keys: string[]): Promise<ConvertUiamAPIKeysResponse | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    this.logger.debug(`Trying to convert ${keys.length} API key(s)`);

    try {
      return await this.uiam.convertApiKeys(keys);
    } catch (e) {
      this.logger.error(`Failed to convert API keys: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  /**
   * Returns the header(s) trusted loopback callers stamp on real requests carrying an internal
   * UIAM (`essu_`) credential (see {@link UiamAPIKeysType.getInternalCallerAttestationHeaders}).
   */
  getInternalCallerAttestationHeaders(credential: HTTPAuthorizationHeader) {
    return this.uiam.getInternalCallerAttestationHeaders(credential);
  }

  isOwnClientAuthentication(value: string): boolean {
    const own = this.uiam.getClientAuthentication().value;
    const presented = Buffer.from(value);
    const expected = Buffer.from(own);
    return presented.length === expected.length && timingSafeEqual(presented, expected);
  }

  /**
   * A fake request has no authenticated user to inspect, so the external marker set by its builder
   * is the only signal that it carries an external key.
   */
  isExternalApiKey(request: KibanaRequest): boolean {
    return (
      isExternalUiamCredential(request) ||
      userHasExternalApiKey(this.authenticator.getCurrentUser(request))
    );
  }

  /**
   * Extracts and returns the authorization header from the request.
   *
   * @param request The Kibana request instance.
   * @returns The HTTP authorization header extracted from the request.
   * @throws {Error} If the request does not contain an authorization header.
   */
  static getAuthorizationHeader(request: Pick<KibanaRequest, 'headers'>) {
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);

    if (!authorizationHeader) {
      throw new Error(
        `Unable to determine if request has UIAM credentials, request does not contain an authorization header`
      );
    }

    return authorizationHeader;
  }
}

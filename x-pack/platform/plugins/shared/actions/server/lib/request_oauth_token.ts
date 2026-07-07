/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'query-string';
import axios from 'axios';
import { get } from 'lodash';
import { stableStringify } from '@kbn/std';
import type { Logger } from '@kbn/core/server';
import type { RefreshTokenOAuthRequestParams } from './request_oauth_refresh_token';
import type { JWTOAuthRequestParams } from './request_oauth_jwt_token';
import type { ClientCredentialsOAuthRequestParams } from './request_oauth_client_credentials_token';
import { request } from './axios_utils';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { AsApiContract } from '../../common';
import type { AuthorizationCodeOAuthRequestParams } from './request_oauth_authorization_code_token';

export interface TokenResponseOptions {
  accessTokenPath?: string;
  tokenTypePath?: string;
  /** Literal token type for Authorization header; when set, bypasses `tokenTypePath` extraction. */
  tokenType?: string;
}

/**
 * Builds a TokenResponseOptions from a bag of optional fields.
 * Returns undefined when no custom options are set (all callers get default behavior).
 */
export const buildTokenResponseOptions = (opts: {
  accessTokenPath?: string;
  tokenTypePath?: string;
  tokenType?: string;
}): TokenResponseOptions | undefined => {
  const { accessTokenPath, tokenTypePath, tokenType } = opts;
  if (!accessTokenPath && !tokenTypePath && !tokenType) {
    return undefined;
  }
  return { accessTokenPath, tokenTypePath, tokenType };
};

export interface OAuthTokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
}

type OAuthBodyRequest =
  | AuthorizationCodeOAuthRequestParams
  | ClientCredentialsOAuthRequestParams
  | JWTOAuthRequestParams
  | RefreshTokenOAuthRequestParams;

export async function requestOAuthToken<T>(
  tokenUrl: string,
  grantType: string,
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  bodyRequest: AsApiContract<T>,
  useBasicAuth: boolean = false,
  tokenResponseOptions?: TokenResponseOptions
): Promise<OAuthTokenResponse> {
  const axiosInstance = axios.create();

  // Extract client credentials for Basic Auth if needed
  const {
    client_id: clientId,
    client_secret: clientSecret,
    ...restBody
  } = bodyRequest as AsApiContract<OAuthBodyRequest>;

  const requestData = {
    ...(useBasicAuth ? restBody : bodyRequest),
    grant_type: grantType,
  };

  const basicAuth =
    useBasicAuth && clientId && clientSecret
      ? { username: clientId, password: clientSecret }
      : undefined;

  const res = await request({
    axios: axiosInstance,
    url: tokenUrl,
    method: 'post',
    logger,
    data: qs.stringify(requestData),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json',
    },
    ...(basicAuth ? { auth: basicAuth } : {}),
    configurationUtilities,
    validateStatus: () => true,
  });

  if (res.status === 200) {
    if (typeof res.data !== 'object' || res.data == null) {
      logger.warn(
        `OAuth token endpoint ${tokenUrl} returned a non-JSON response. Ensure the provider supports Accept: application/json.`
      );
      throw new Error(
        'OAuth token endpoint returned a non-JSON response body. The access token could not be parsed.'
      );
    }

    const accessTokenField = tokenResponseOptions?.accessTokenPath ?? 'access_token';
    const tokenTypeField = tokenResponseOptions?.tokenTypePath ?? 'token_type';

    const accessToken = get(res.data, accessTokenField);
    const tokenType = tokenResponseOptions?.tokenType ?? get(res.data, tokenTypeField);

    if (!accessToken) {
      logger.warn(
        `OAuth token response from ${tokenUrl} is missing access_token (path: ${accessTokenField}).`
      );
      throw new Error('OAuth token response is missing required field (access_token).');
    }
    if (!tokenType) {
      logger.warn(
        `OAuth token response from ${tokenUrl} is missing token_type (path: ${tokenTypeField}).`
      );
      throw new Error('OAuth token response is missing required field (token_type).');
    }

    // When the access token is nested (e.g. "authed_user.access_token"),
    // look for sibling fields at the same level before falling back to top-level.
    const parentPath = accessTokenField.includes('.')
      ? accessTokenField.substring(0, accessTokenField.lastIndexOf('.'))
      : undefined;
    const siblingOrRoot = (field: string) => {
      if (parentPath) {
        const nested = get(res.data, `${parentPath}.${field}`);
        if (nested !== undefined) return nested;
      }
      return get(res.data, field);
    };

    return {
      tokenType,
      accessToken,
      expiresIn: siblingOrRoot('expires_in'),
      refreshToken: siblingOrRoot('refresh_token'),
      refreshTokenExpiresIn:
        siblingOrRoot('refresh_expires_in') ?? siblingOrRoot('refresh_token_expires_in'),
    };
  } else {
    const errString = stableStringify(res.data);
    logger.warn(`error thrown getting the access token from ${tokenUrl}: ${errString}`);
    throw new Error(errString);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'query-string';
import axios from 'axios';
import stringify from 'json-stable-stringify';
import type { Logger } from '@kbn/core/server';
import { request } from './axios_utils';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { AsApiContract } from '../../common';
import { getBasicAuthHeader } from './get_basic_auth_header';

export interface OAuthTokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
}

export async function requestOAuthToken<T>(
  tokenUrl: string,
  grantType: string,
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  bodyRequest: AsApiContract<T>,
  useBasicAuth: boolean = false
): Promise<OAuthTokenResponse> {
  const axiosInstance = axios.create();

  // Extract client credentials for Basic Auth if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { client_id: clientId, client_secret: clientSecret, ...restBody } = bodyRequest as any;

  const requestData = {
    ...(useBasicAuth ? restBody : bodyRequest),
    grant_type: grantType,
  };

  const requestHeaders = {
    ...(useBasicAuth && clientId && clientSecret
      ? getBasicAuthHeader({ username: clientId, password: clientSecret })
      : {}),
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  };

  const res = await request({
    axios: axiosInstance,
    url: tokenUrl,
    method: 'post',
    logger,
    data: qs.stringify(requestData),
    headers: requestHeaders,
    configurationUtilities,
    validateStatus: () => true,
  });

  if (res.status === 200) {
    return {
      tokenType: res.data.token_type,
      accessToken: res.data.access_token,
      expiresIn: res.data.expires_in,
      refreshToken: res.data.refresh_token,
      refreshTokenExpiresIn: res.data.refresh_token_expires_in,
    };
  } else {
    const errString = stringify(res.data);
    logger.warn(`error thrown getting the access token from ${tokenUrl}: ${errString}`);
    throw new Error(errString);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { stableStringify } from '@kbn/std';
import type { Logger } from '@kbn/core/server';
import { request } from './axios_utils';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { OAuthTokenResponse } from './request_oauth_token';

export interface EarsRefreshTokenRequestParams {
  refreshToken: string;
}

/**
 * Derives the EARS refresh endpoint from the token URL by replacing `/token` with `/refresh`.
 */
export function getEarsRefreshUrl(tokenUrl: string): string {
  return tokenUrl.replace(/\/token$/, '/refresh');
}

/**
 * Refresh an access token via the EARS refresh endpoint.
 *
 * EARS uses a JSON request body with `{ refresh_token }` — no grant_type,
 * no client credentials. The refresh endpoint is derived from the token URL
 * by replacing `/token` with `/refresh`.
 */
export async function requestEarsRefreshToken(
  tokenUrl: string,
  logger: Logger,
  params: EarsRefreshTokenRequestParams,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<OAuthTokenResponse> {
  const axiosInstance = axios.create();
  const refreshUrl = getEarsRefreshUrl(tokenUrl);

  const res = await request({
    axios: axiosInstance,
    url: refreshUrl,
    method: 'post',
    logger,
    data: {
      refresh_token: params.refreshToken,
    },
    headers: {
      'Content-Type': 'application/json',
    },
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
    const errString = stableStringify(res.data);
    logger.warn(`error thrown refreshing the access token from EARS ${refreshUrl}: ${errString}`);
    throw new Error(errString);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { stableStringify } from '@kbn/std';
import type { Logger } from '@kbn/core/server';
import { getEarsEndpointsForProvider, resolveEarsUrl } from './url';
import { request } from '../axios_utils';
import type { ActionsConfigurationUtilities } from '../../actions_config';

export interface EarsRevokeTokenRequestParams {
  token: string;
}

/**
 * Revoke a token (access or refresh) via the EARS revoke endpoint.
 *
 * EARS uses a JSON request body with `{ token }` and forwards the request to
 * the provider's own revoke endpoint (e.g. Google's `https://oauth2.googleapis.com/revoke`).
 * This is best-effort: callers should not let a revoke failure block local token deletion.
 */
export async function requestEarsRevoke(
  provider: string,
  logger: Logger,
  params: EarsRevokeTokenRequestParams,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<void> {
  const axiosInstance = axios.create();
  const { revokeEndpoint: earsRevokePath } = getEarsEndpointsForProvider(provider);
  const revokeUrl = resolveEarsUrl(earsRevokePath, configurationUtilities.getEarsUrl());

  const res = await request({
    axios: axiosInstance,
    url: revokeUrl,
    method: 'post',
    logger,
    data: {
      token: params.token,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    configurationUtilities,
    sslOverrides: configurationUtilities.getEARSSSLSettings(),
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    const errString = stableStringify(res.data);
    logger.debug(`error thrown revoking a token from EARS ${revokeUrl}: ${errString}`);
    throw new Error('Failed to revoke token via auth redirect service');
  }
}

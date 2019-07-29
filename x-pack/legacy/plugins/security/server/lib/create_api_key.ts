/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { getClient } from '../../../../server/lib/get_client_shield';

export interface CreateApiKeyParams {
  name: string;
  role_descriptors: Record<string, any>;
  expiration?: string;
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  expiration: number;
  api_key: string;
}

export function createApiKeyProvider(server: any) {
  const callWithRequest = getClient(server).callWithRequest;

  server.expose('createApiKey', async (request: Legacy.Request, params: CreateApiKeyParams) => {
    const xpackInfo = server.plugins.xpack_main.info;
    if (xpackInfo && xpackInfo.isAvailable() && !xpackInfo.feature('security').isEnabled()) {
      return Promise.resolve(null);
    }
    return await callWithRequest(request, 'shield.createApiKey', { body: params });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { isUiamCredential } from '@kbn/core-security-server';
import { decodeStoredApiKey } from './stored_api_key';

export interface RequestApiKeyCredentials {
  /** Key id; absent for user-created Cloud (UIAM) API keys, which are raw `essu_` secrets. */
  id?: string;
  api_key?: string;
}

const getCredentialsFromRequest = (request: KibanaRequest) => {
  const authorizationHeaderValue = request.headers.authorization;
  if (!authorizationHeaderValue || typeof authorizationHeaderValue !== 'string') {
    return null;
  }
  const [scheme] = authorizationHeaderValue.split(/\s+/);
  if (scheme.toLowerCase() !== 'apikey') {
    return null;
  }
  return authorizationHeaderValue.substring(scheme.length + 1);
};

/** Extracts the `ApiKey` credentials the request is authenticated with, or `null` when there are none. */
export const getApiKeyFromRequest = (request: KibanaRequest): RequestApiKeyCredentials | null => {
  const credentials = getCredentialsFromRequest(request);
  if (credentials) {
    // A user-created Cloud API key (obtained from the Elastic Cloud UI) is a raw `essu_`
    // secret with no key id and no base64 encoding, unlike framework-granted UIAM keys
    // and Elasticsearch API keys, which are encoded as `base64(id:key)`.
    if (isUiamCredential(credentials)) {
      return { api_key: credentials };
    }

    const { id, secret } = decodeStoredApiKey(credentials);

    return {
      id,
      api_key: secret,
    };
  }
  return null;
};

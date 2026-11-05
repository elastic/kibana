/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

export type ApiKeySource = 'reuse' | 'clone' | 'grant';

/**
 * The one place that decides where a plugin's API keys come from. A caller authenticated with an
 * API key has its key reused, or cloned when the key is borrowed or the plugin never reuses keys.
 * Every other caller gets freshly granted keys.
 */
export const chooseApiKeySource = ({
  apiKeyAuthenticated,
  clone,
  reuse,
}: {
  apiKeyAuthenticated: boolean;
  clone: boolean;
  reuse: boolean;
}): ApiKeySource => {
  if (!apiKeyAuthenticated) {
    return 'grant';
  }
  return clone || !reuse ? 'clone' : 'reuse';
};

/** Whether the request is authenticated with an API key, falling back to the header's scheme. */
export const isApiKeyAuthenticated = (
  security: SecurityServiceStart,
  request: KibanaRequest
): boolean => {
  const user = security.authc.getCurrentUser(request);
  if (user?.authentication_type) {
    return user.authentication_type === 'api_key';
  }
  return HTTPAuthorizationHeader.parseFromRequest(request)?.scheme.toLowerCase() === 'apikey';
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core-http-server';
import { isUiamCredential } from '@kbn/core-security-server';
import { getApiKeyFromRequest } from './request_api_key';
import type { ResolveScopedApiKeysOpts, ScopedApiKeysDeps, ScopedCredentials } from './types';

/**
 * Returns the caller's own API key as user-created credentials. Throws a 400 when the request
 * does not carry a usable key, or carries a UIAM key while UIAM is not enabled.
 */
export const reuseRequestApiKey = (
  request: KibanaRequest,
  { security }: ScopedApiKeysDeps,
  { uiamEnabled }: Pick<ResolveScopedApiKeysOpts, 'uiamEnabled'>
): ScopedCredentials => {
  const credentials = getApiKeyFromRequest(request);
  if (!credentials?.api_key) {
    throw Boom.badRequest('Could not extract an API key from the request authorization header.');
  }

  const { id, api_key: secret } = credentials;

  if (isUiamCredential(secret)) {
    if (!uiamEnabled) {
      throw Boom.badRequest(
        'Cloud API keys are only supported in serverless environments; use a project-scoped Elasticsearch API key instead.'
      );
    }
    // UIAM's own verdict, reported on the current user. Absent means internal (fail closed).
    const external = security.authc.getCurrentUser(request)?.api_key?.internal === false;
    return {
      uiam: { ...(id ? { id } : {}), secret },
      createdByUser: true,
      ...(external ? { uiamExternal: true as const } : {}),
    };
  }

  if (!id || !secret) {
    throw Boom.badRequest(
      'Failed to parse API key credentials from the request authorization header.'
    );
  }

  return { es: { id, secret }, createdByUser: true };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { CloudApiKeyNotSupportedError } from '../errors';
import type { ApiKeys } from '../store/api_keys';
import { decodeApiKey } from '../store/api_keys';
import { isUiamEnabled } from './grant';
import type { ClientContext, CreateOptions } from './types';

/**
 * Returns the API key the request is authenticated with, owned by the caller. A Cloud (UIAM) key
 * throws {@link CloudApiKeyNotSupportedError} when UIAM isn't enabled.
 */
export const reuse = (
  context: ClientContext,
  request: KibanaRequest,
  options: Pick<CreateOptions, 'subject' | 'esOnly'>
): ApiKeys => {
  const { subject } = options;
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  const credentials =
    authorizationHeader?.scheme.toLowerCase() === 'apikey'
      ? authorizationHeader.credentials
      : undefined;
  if (!credentials) {
    throw new Error(`Failed to extract API key from authorization header for ${subject}`);
  }

  const external = context.security.authc.getCurrentUser(request)?.api_key?.internal === false;
  if (isUiamCredential(credentials)) {
    if (!isUiamEnabled(context, options)) {
      throw new CloudApiKeyNotSupportedError(subject);
    }
    return { createdByUser: true, uiam: { secret: credentials, external } };
  }

  const { id, secret } = decodeApiKey(credentials);
  if (!id || !secret) {
    throw new Error(`Failed to parse API key credentials from authorization header for ${subject}`);
  }

  if (isUiamCredential(secret)) {
    if (!isUiamEnabled(context, options)) {
      throw new CloudApiKeyNotSupportedError(subject);
    }
    return { createdByUser: true, uiam: { id, secret, external } };
  }

  return { createdByUser: true, es: { id, encoded: credentials } };
};

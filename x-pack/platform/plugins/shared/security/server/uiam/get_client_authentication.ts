/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamBearerCredential } from '@kbn/core-security-server';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../common/constants';

/**
 * Client authentication composed by the caller: a value to present verbatim. Where this type is
 * accepted, `null` means deliberately no client authentication at all, which UIAM requires for
 * external (organization) API keys, and `undefined` means the caller supplied nothing and Kibana's
 * own assertion is presented instead.
 */
export interface UiamClientAuthentication {
  readonly value: string;
}

/**
 * Client authentication that rode in with a UIAM bearer token, or `undefined` when the caller
 * supplied none and Kibana's own assertion should be used instead.
 */
export const getUiamClientAuthentication = (
  request: KibanaRequest
): UiamClientAuthentication | undefined => {
  const authorization = HTTPAuthorizationHeader.parseFromRequest(request);
  if (!authorization || !isUiamBearerCredential(authorization)) {
    return undefined;
  }

  const value = request.headers[ES_CLIENT_AUTHENTICATION_HEADER];
  return typeof value === 'string' ? { value } : undefined;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../common/constants';

/** Client authentication supplied by the caller. */
export interface UiamClientAuthentication {
  readonly sharedSecret?: string;
}

/**
 * Client authentication that rode in with a UIAM bearer token, or `undefined` when the caller
 * supplied none and Kibana's own shared secret should be used instead.
 */
export const getUiamClientAuthentication = (
  request: KibanaRequest
): UiamClientAuthentication | undefined => {
  const authorization = HTTPAuthorizationHeader.parseFromRequest(request);
  if (authorization?.scheme.toLowerCase() !== 'bearer' || !isUiamCredential(authorization)) {
    return undefined;
  }

  const sharedSecret = request.headers[ES_CLIENT_AUTHENTICATION_HEADER];
  return typeof sharedSecret === 'string' ? { sharedSecret } : undefined;
};

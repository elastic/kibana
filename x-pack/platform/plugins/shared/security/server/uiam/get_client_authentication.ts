/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../common/constants';

/** Client authentication supplied by the caller; an empty object preserves its absence. */
export interface UiamClientAuthentication {
  readonly sharedSecret?: string;
}

/** Preserves client authentication for inbound bearer tokens, including a missing header. */
export const getUiamClientAuthentication = (
  request: KibanaRequest
): UiamClientAuthentication | undefined => {
  const authorization = HTTPAuthorizationHeader.parseFromRequest(request);
  if (authorization?.scheme.toLowerCase() !== 'bearer') {
    return undefined;
  }

  const sharedSecret = request.headers[ES_CLIENT_AUTHENTICATION_HEADER];
  if (typeof sharedSecret === 'string') {
    return { sharedSecret };
  }
  return request.isFakeRequest ? undefined : {};
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../common/constants';

/** Client authentication supplied by the caller; an empty object preserves its absence. */
export interface UiamClientAuthentication {
  readonly sharedSecret?: string;
}

/** Preserves request client authentication, allowing a default only for internally created requests. */
export const getUiamClientAuthentication = (
  request: KibanaRequest
): UiamClientAuthentication | undefined => {
  const sharedSecret = request.headers[ES_CLIENT_AUTHENTICATION_HEADER];
  if (typeof sharedSecret === 'string') {
    return { sharedSecret };
  }
  return request.isFakeRequest ? undefined : {};
};

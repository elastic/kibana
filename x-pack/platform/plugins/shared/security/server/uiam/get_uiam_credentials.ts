/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';

/**
 * Extracts UIAM bearer-token or API-key credentials from the request.
 */
export const getUiamCredentialsFromRequest = (request: KibanaRequest): string => {
  const authorization = HTTPAuthorizationHeader.parseFromRequest(request);

  if (!authorization) {
    throw Boom.unauthorized('Request does not contain an authorization header');
  }

  if (!isUiamCredential(authorization)) {
    throw Boom.badRequest('Provided credential is not compatible with UIAM');
  }

  return authorization.credentials;
};

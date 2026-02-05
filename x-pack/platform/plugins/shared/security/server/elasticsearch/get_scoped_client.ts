/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, KibanaRequest } from '@kbn/core/server';

import { HTTPAuthorizationHeader } from '../authentication/http_authentication';
import { isUiamCredential, type UiamServicePublic } from '../uiam';

/**
 * Gets a scoped Elasticsearch client for the given request, handling UIAM credentials appropriately.
 *
 * @param request Request instance.
 * @param clusterClient The cluster client to scope.
 * @param uiam Optional UIAM service for handling UIAM credentials.
 * @returns A scoped Elasticsearch client.
 */
export function getScopedClient(
  request: KibanaRequest,
  clusterClient: IClusterClient,
  uiam?: UiamServicePublic
) {
  // If we're not in UIAM mode or if the request is not a fake request, use request scope directly.
  if (!uiam || !request.isFakeRequest) {
    return clusterClient.asScoped(request);
  }

  // In UIAM mode and for fake requests, it's still possible that the request is authenticated with non-UIAM credentials.
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);

  if (!authorizationHeader || !isUiamCredential(authorizationHeader)) {
    return clusterClient.asScoped(request);
  }

  // For UIAM credentials, we need to add the UIAM authentication header to the scoped client.
  return clusterClient.asScoped({
    headers: { ...request.headers, ...uiam.getEsClientAuthenticationHeader() },
  });
}

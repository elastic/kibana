/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { FleetUnauthorizedError } from '../../errors';
import { appContextService } from '..';

/**
 * Checks that the caller represented by `request` holds all the given Kibana
 * API privileges in every space in `spaceIds`.
 *
 * Returns immediately (no-op) when:
 *  - There is no security plugin (e.g. in tests with security disabled)
 *  - RBAC is not active for this request
 *  - `spaceIds` is empty (nothing cross-space is affected)
 *
 * Throws `FleetUnauthorizedError` (→ 403) when the check fails.
 * The error message must not expose the hidden space IDs.
 */
export async function assertPrivilegesInSpaces({
  request,
  spaceIds,
  apiPrivileges,
  errorMessage,
}: {
  request: KibanaRequest;
  spaceIds: Iterable<string>;
  apiPrivileges: string[];
  errorMessage: string;
}): Promise<void> {
  const security = appContextService.getSecurity();
  if (!security) {
    return;
  }

  if (!security.authz.mode.useRbacForRequest(request)) {
    return;
  }

  const spaceIdsArray = Array.from(spaceIds);
  if (spaceIdsArray.length === 0) {
    return;
  }

  const { authz } = security;
  const result = await authz.checkPrivilegesWithRequest(request).atSpaces(spaceIdsArray, {
    kibana: apiPrivileges.map((p) => authz.actions.api.get(p)),
  });

  if (!result.hasAllRequested) {
    throw new FleetUnauthorizedError(errorMessage);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

/**
 * Returns the requested spaces (other than the active one) the caller lacks `manage_evals` in,
 * so write routes can reject cross-space targets not covered by `requiredPrivileges`. Fails
 * closed: without a privilege checker, every foreign space is treated as unauthorized.
 */
export const findUnauthorizedTargetSpaces = async ({
  request,
  requestedSpaceIds,
  activeSpaceId,
  checkManageEvalsPrivileges,
}: {
  request: KibanaRequest;
  requestedSpaceIds: string[] | undefined;
  activeSpaceId: string;
  checkManageEvalsPrivileges?: (request: KibanaRequest, spaceIds: string[]) => Promise<boolean>;
}): Promise<string[]> => {
  const foreignSpaceIds = Array.from(new Set(requestedSpaceIds ?? [])).filter(
    (spaceId) => spaceId !== activeSpaceId
  );
  if (foreignSpaceIds.length === 0) {
    return [];
  }
  const authorized = checkManageEvalsPrivileges
    ? await checkManageEvalsPrivileges(request, foreignSpaceIds)
    : false;
  return authorized ? [] : foreignSpaceIds;
};

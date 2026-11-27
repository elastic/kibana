/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';

import { FleetUnauthorizedError } from '../../errors';
import { appContextService } from '..';
import { getAllSpaceIds } from '../spaces/helpers';

/**
 * Checks that the caller represented by `request` holds all the given Kibana
 * API privileges in every space in `spaceIds`.
 *
 * When `spaceIds` contains `'*'` (ALL_SPACES_ID), a global privilege check is
 * used instead of a per-space check, because only a globally-granted privilege
 * covers all spaces. Per-space grants do not satisfy `atSpaces(['*'])`.
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
  const kibanaPrivileges = { kibana: apiPrivileges.map((p) => authz.actions.api.get(p)) };
  const checker = authz.checkPrivilegesWithRequest(request);

  // When any policy is shared to all spaces ('*'), a global privilege check is
  // required — per-space grants do not satisfy atSpaces(['*']).
  const hasAllSpaces = spaceIdsArray.includes(ALL_SPACES_ID);
  const concreteSpaceIds = spaceIdsArray.filter((id) => id !== ALL_SPACES_ID);

  let hasAllRequested = true;

  if (hasAllSpaces) {
    const result = await checker.globally(kibanaPrivileges);
    if (!result.hasAllRequested) {
      hasAllRequested = false;
    }
  }

  if (hasAllRequested && concreteSpaceIds.length > 0) {
    const result = await checker.atSpaces(concreteSpaceIds, kibanaPrivileges);
    if (!result.hasAllRequested) {
      hasAllRequested = false;
    }
  }

  if (!hasAllRequested) {
    throw new FleetUnauthorizedError(errorMessage);
  }
}

type SpaceLookup = () => Promise<{ spaceIds: Set<string>; truncated: boolean }>;

function isRbacActive(request: KibanaRequest) {
  const security = appContextService.getSecurity();
  return !!security && security.authz.mode.useRbacForRequest(request);
}

/** A global default applies to every space, so require Fleet privileges in all of them. */
export async function assertCanManageDefaultSettings(
  request: KibanaRequest,
  objectType: string
): Promise<void> {
  if (!isRbacActive(request)) {
    return;
  }
  const { spaceIds, truncated } = await getAllSpaceIds();
  if (truncated) {
    throw new FleetUnauthorizedError(
      `Unable to verify authorization for ${objectType}: too many spaces to enumerate`
    );
  }
  await assertPrivilegesInSpaces({
    request,
    spaceIds,
    apiPrivileges: ['fleet-agent-policies-all'],
    errorMessage: `Insufficient privileges for ${objectType}: global defaults apply to every space and require Fleet agent policy privileges in all spaces`,
  });
}

/**
 * Authorizes a write to a space-agnostic settings object: in every space when it is (or becomes)
 * the default, otherwise in the spaces of the policies that reference it.
 */
export async function assertCanWriteSettingsObject({
  request,
  objectType,
  id,
  action,
  isDefault,
  references,
}: {
  request: KibanaRequest;
  objectType: string;
  id: string;
  action: 'update' | 'delete';
  isDefault: boolean;
  references: Array<{ getSpaces: SpaceLookup; apiPrivileges: string[] }>;
}): Promise<void> {
  if (!isRbacActive(request)) {
    return;
  }
  if (isDefault) {
    return assertCanManageDefaultSettings(request, objectType);
  }
  const results = await Promise.all(references.map(({ getSpaces }) => getSpaces()));
  if (results.some(({ truncated }) => truncated)) {
    throw new FleetUnauthorizedError(
      `Unable to verify ${action} authorization for ${objectType} ${id}: too many agent policies to enumerate`
    );
  }
  const errorMessage = `Insufficient privileges to ${action} ${objectType} ${id}: it is used by agent policies in spaces you are not authorized to access`;
  for (const [i, { apiPrivileges }] of references.entries()) {
    await assertPrivilegesInSpaces({
      request,
      spaceIds: results[i].spaceIds,
      apiPrivileges,
      errorMessage,
    });
  }
}

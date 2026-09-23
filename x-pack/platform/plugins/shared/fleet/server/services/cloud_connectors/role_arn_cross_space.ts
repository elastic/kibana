/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KibanaRequest } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';

import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { FleetUnauthorizedError } from '../../errors';

import { appContextService } from '../app_context';

/**
 * Shown by the federated-identity flyout when a Role ARN edit is refused because the connector
 * is shared and the caller cannot write integration policies in every space that can see it.
 */
const roleArnSharedSpacesUnauthorizedMessage = (): string =>
  i18n.translate('xpack.fleet.cloudConnector.roleArnSharedSpacesUnauthorized', {
    defaultMessage:
      'This identity is shared with other spaces. You need permission to write integration policies in each of them before its Role ARN can change.',
  });

const sharedSpacesUnauthorized = (): FleetUnauthorizedError =>
  new FleetUnauthorizedError(roleArnSharedSpacesUnauthorizedMessage());

/** True when the connector is visible in more than one space, including all spaces. */
export const isConnectorSharedAcrossSpaces = (namespaces: string[] | undefined): boolean => {
  const spaceIds = (namespaces ?? []).filter((spaceId) => spaceId.length > 0);
  return spaceIds.includes(ALL_SPACES_ID) || new Set(spaceIds).size > 1;
};

/** Current space first so a later space's failure reverts the caller's space before the others. */
const orderCurrentSpaceFirst = (spaceIds: string[], currentSpaceId: string): string[] => {
  if (!spaceIds.includes(currentSpaceId)) {
    return spaceIds;
  }
  return [currentSpaceId, ...spaceIds.filter((spaceId) => spaceId !== currentSpaceId)];
};

const assertCanWriteIntegrationPoliciesInSpaces = async (
  request: KibanaRequest,
  spaceIds: string[]
): Promise<void> => {
  const security = appContextService.getSecurity();
  if (!security?.authz?.checkPrivilegesWithRequest || !security.authz.actions?.api?.get) {
    throw sharedSpacesUnauthorized();
  }

  const checkResult = await security.authz.checkPrivilegesWithRequest(request).atSpaces(spaceIds, {
    kibana: [
      security.authz.actions.api.get(FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL),
      security.authz.actions.api.get(FLEET_API_PRIVILEGES.INTEGRATIONS.ALL),
    ],
  });
  if (!checkResult?.hasAllRequested) {
    throw sharedSpacesUnauthorized();
  }
};

/**
 * A connector shared with all spaces needs the privileges granted in all spaces, because the
 * spaces list only returns spaces the caller can access and would hide the rest.
 */
const authorizeAllSpacesConnector = async (
  currentSpaceId: string,
  request?: KibanaRequest,
  listSpaces?: () => Promise<Array<{ id: string }>>
): Promise<string[]> => {
  if (!request || !listSpaces) {
    throw sharedSpacesUnauthorized();
  }
  await assertCanWriteIntegrationPoliciesInSpaces(request, [ALL_SPACES_ID]);

  const listed = await listSpaces();
  const spaceIds = [
    ...new Set(
      listed
        .map((space) => space.id)
        .filter((spaceId) => spaceId.length > 0 && spaceId !== ALL_SPACES_ID)
    ),
  ];
  if (spaceIds.length === 0) {
    throw sharedSpacesUnauthorized();
  }
  return orderCurrentSpaceFirst(spaceIds, currentSpaceId);
};

/**
 * Spaces a shared connector's Role ARN edit must cover. Throws when the caller cannot write
 * integration policies in every one of them. The current space is first.
 */
export const authorizeSharedConnectorRoleArnSpaces = async ({
  currentSpaceId,
  namespaces,
  request,
  listSpaces,
}: {
  currentSpaceId: string;
  namespaces: string[] | undefined;
  request?: KibanaRequest;
  listSpaces?: () => Promise<Array<{ id: string }>>;
}): Promise<string[]> => {
  const unique = [...new Set((namespaces ?? []).filter((spaceId) => spaceId.length > 0))];
  if (unique.includes(ALL_SPACES_ID)) {
    return authorizeAllSpacesConnector(currentSpaceId, request, listSpaces);
  }

  const spaceIds = orderCurrentSpaceFirst(unique, currentSpaceId);
  if (spaceIds.length > 1) {
    if (!request) {
      throw sharedSpacesUnauthorized();
    }
    await assertCanWriteIntegrationPoliciesInSpaces(request, spaceIds);
  }

  return spaceIds;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthMode } from '@kbn/connector-specs';
import { findConnectorsSo } from '../../../../data/connector';
import type { GetUserTokenConnectorsSoResult } from '../../../../data/connector/types';
import { getAuthMode } from '../../lib/get_auth_mode';
import { getUserTokenConnectorsForProfile, resolveProfileUidForRequest } from '../../lib';
import { filterInferenceConnectors } from '../get_all/get_all';
import type { GetAuthStatusParams, GetAuthStatusResult } from './types';
import type { Connector } from '../../types';

function deriveUserAuthStatus(
  connectorId: string,
  userTokenConnectors: GetUserTokenConnectorsSoResult,
  authMode: AuthMode | undefined
): GetAuthStatusResult[string]['userAuthStatus'] {
  if (!authMode || authMode === 'shared') {
    return 'not_applicable';
  }
  if (userTokenConnectors.connectorIds.includes(connectorId)) {
    return 'connected';
  }
  return 'not_connected';
}

export async function getAuthStatus({
  context,
}: GetAuthStatusParams): Promise<GetAuthStatusResult> {
  await context.authorization.ensureAuthorized({ operation: 'get' });

  const profileUid = await resolveProfileUidForRequest({
    request: context.request,
    getCurrentUser: context.getCurrentUser,
    getCurrentUserProfileIdFromAPIKey: context.getCurrentUserProfileIdFromAPIKey,
    getCurrentUserProfileIdFromBasicAuth: context.getCurrentUserProfileIdFromBasicAuth,
  });

  const userTokenConnectors = await getUserTokenConnectorsForProfile({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    profileUid,
  });

  const namespace = context.spaceId
    ? context.spaces?.spaceIdToNamespace(context.spaceId)
    : undefined;

  const { saved_objects: savedObjects } = await findConnectorsSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    namespace,
  });

  const results: GetAuthStatusResult = {};

  for (const so of savedObjects) {
    const authMode = getAuthMode(so.attributes.authMode as Connector['authMode'] | undefined);
    results[so.id] = {
      userAuthStatus: deriveUserAuthStatus(so.id, userTokenConnectors, authMode),
    };
  }

  const nonSystemInMemory = context.inMemoryConnectors.filter(
    (connector) => !connector.isSystemAction
  );
  const filteredInMemory = await filterInferenceConnectors(
    context.scopedClusterClient.asInternalUser,
    nonSystemInMemory
  );

  for (const connector of filteredInMemory) {
    results[connector.id] = { userAuthStatus: 'not_applicable' };
  }

  return results;
}

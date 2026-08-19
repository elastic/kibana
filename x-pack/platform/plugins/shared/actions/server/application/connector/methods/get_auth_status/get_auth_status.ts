/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthMode } from '@kbn/connector-specs';
import { findConnectorsSo } from '../../../../data/connector';
import type { GetUserTokenConnectorsSoResult } from '../../../../data/connector/types';
import { filterInferenceConnectors } from '../get_all';
import { getAuthMode } from '../../lib/get_auth_mode';
import { getUserTokenConnectorsForProfile } from '../../lib';
import type { Connector } from '../../types';
import type { GetAuthStatusParams, GetAuthStatusResult } from './types';
import type { RawAction } from '../../../../types';

function deriveUserAuthStatus(
  connectorId: string,
  userTokenConnectors: GetUserTokenConnectorsSoResult,
  authMode: AuthMode
): GetAuthStatusResult[string]['userAuthStatus'] {
  if (authMode === 'shared') {
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

  const profileUid = await context.getCurrentUserProfileId?.(context.request);

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
    fields: ['authMode'],
  });

  const results: GetAuthStatusResult = {};

  for (const so of savedObjects) {
    const authMode = getAuthMode(
      (so.attributes as RawAction | undefined)?.authMode as Connector['authMode'] | undefined
    );
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthMode } from '@kbn/connector-specs';
import { findConnectorsSo } from '../../../../data/connector';
import { filterInferenceConnectors } from '../get_all';
import { getAuthMode } from '../../lib/get_auth_mode';
import type { Connector } from '../../types';
import type { GetAuthStatusParams, GetAuthStatusResult } from './types';
import type { RawAction } from '../../../../types';

function deriveUserAuthStatus(
  isUsableToken: boolean,
  authMode: AuthMode
): GetAuthStatusResult[string]['userAuthStatus'] {
  if (authMode === 'shared') {
    return 'not_applicable';
  }
  return isUsableToken ? 'connected' : 'not_connected';
}

export async function getAuthStatus({
  context,
}: GetAuthStatusParams): Promise<GetAuthStatusResult> {
  await context.authorization.ensureAuthorized({ operation: 'get' });

  const profileUid = await context.getCurrentUserProfileId?.(context.request);

  const namespace = context.spaceId
    ? context.spaces?.spaceIdToNamespace(context.spaceId)
    : undefined;

  const { saved_objects: savedObjects } = await findConnectorsSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    namespace,
    fields: ['authMode'],
  });

  const connectors = savedObjects.map((so) => ({
    id: so.id,
    authMode: getAuthMode(
      (so.attributes as RawAction | undefined)?.authMode as Connector['authMode'] | undefined
    ),
  }));

  // A token only counts as connected while it is usable: unexpired, or refreshable.
  const usableConnectorIds = profileUid
    ? await context.connectorTokenClient.getUsableOAuthConnectorIds({
        profileUid,
        connectorIds: connectors
          .filter(({ authMode }) => authMode !== 'shared')
          .map(({ id }) => id),
      })
    : new Set<string>();

  const results: GetAuthStatusResult = {};

  for (const { id, authMode } of connectors) {
    results[id] = {
      userAuthStatus: deriveUserAuthStatus(usableConnectorIds.has(id), authMode),
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

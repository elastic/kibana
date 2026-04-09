/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorUserAuthStatus } from '@kbn/actions-types';
import type { SavedObjectClientForFind } from '../../../data/connector/types/params';
import type { Connector } from '../types';
import { getUserTokenConnectorsForProfile } from './get_user_token_connectors_for_profile';

export async function resolveUserAuthStatusForConnector({
  authMode,
  connectorId,
  profileUid,
  savedObjectsClient,
}: {
  authMode: Connector['authMode'];
  connectorId: string;
  profileUid: string | undefined;
  savedObjectsClient: SavedObjectClientForFind;
}): Promise<ConnectorUserAuthStatus> {
  if (authMode !== 'per-user') {
    return 'not_applicable';
  }
  if (!profileUid) {
    return 'not_connected';
  }
  const { connectorIds } = await getUserTokenConnectorsForProfile({
    savedObjectsClient,
    profileUid,
  });
  return connectorIds.includes(connectorId) ? 'connected' : 'not_connected';
}

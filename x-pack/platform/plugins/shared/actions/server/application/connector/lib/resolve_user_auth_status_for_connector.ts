/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectClientForFind } from '../../../data/connector/types/params';
import type { Connector } from '../types';
import { mergeUserTokenConnectorsForProfiles } from './merge_user_token_connectors_for_profiles';

export async function resolveUserAuthStatusForConnector({
  authMode,
  connectorId,
  profileUids,
  savedObjectsClient,
}: {
  authMode: Connector['authMode'];
  connectorId: string;
  profileUids: string[];
  savedObjectsClient: SavedObjectClientForFind;
}): Promise<'connected' | 'not_connected' | 'not_applicable'> {
  if (authMode !== 'per-user') {
    return 'not_applicable';
  }
  if (profileUids.length === 0) {
    return 'not_connected';
  }
  const { connectorIds } = await mergeUserTokenConnectorsForProfiles({
    savedObjectsClient,
    profileUids,
  });
  return connectorIds.includes(connectorId) ? 'connected' : 'not_connected';
}

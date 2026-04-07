/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectClientForFind } from '../../../data/connector/types/params';
import { getUserTokenConnectorsSo } from '../../../data/connector/get_user_token_connectors_so';
import type { GetUserTokenConnectorsSoResult } from '../../../data/connector/types';

export async function mergeUserTokenConnectorsForProfiles({
  savedObjectsClient,
  profileUids,
}: {
  savedObjectsClient: SavedObjectClientForFind;
  profileUids: string[];
}): Promise<GetUserTokenConnectorsSoResult> {
  const uniqueUids = [...new Set(profileUids.filter(Boolean))];
  if (uniqueUids.length === 0) {
    return { connectorIds: [] };
  }

  const connectorIdSet = new Set<string>();
  for (const profileUid of uniqueUids) {
    const { connectorIds } = await getUserTokenConnectorsSo({
      savedObjectsClient,
      profileUid,
    });
    connectorIds.forEach((id) => connectorIdSet.add(id));
  }

  return { connectorIds: [...connectorIdSet] };
}

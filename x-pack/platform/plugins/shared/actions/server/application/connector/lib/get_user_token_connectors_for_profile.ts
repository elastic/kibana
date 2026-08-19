/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectClientForFind } from '../../../data/connector/types/params';
import { getUserTokenConnectorsSo } from '../../../data/connector/get_user_token_connectors_so';
import type { GetUserTokenConnectorsSoResult } from '../../../data/connector/types';

export async function getUserTokenConnectorsForProfile({
  savedObjectsClient,
  profileUid,
}: {
  savedObjectsClient: SavedObjectClientForFind;
  profileUid: string | undefined;
}): Promise<GetUserTokenConnectorsSoResult> {
  if (!profileUid) {
    return { connectorIds: [] };
  }

  return getUserTokenConnectorsSo({
    savedObjectsClient,
    profileUid,
  });
}

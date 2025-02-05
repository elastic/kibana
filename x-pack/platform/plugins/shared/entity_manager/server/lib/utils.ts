/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { EntityManagerServerSetup } from '../types';
import { EntityDiscoveryAPIKey } from './auth/api_key/api_key';
import { EntityDiscoveryApiKeyType } from '../saved_objects';

export const getClientsFromAPIKey = ({
  apiKey,
  server,
}: {
  apiKey: EntityDiscoveryAPIKey;
  server: EntityManagerServerSetup;
}): { clusterClient: IScopedClusterClient; soClient: SavedObjectsClientContract } => {
  const fakeRequest = getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey });
  const clusterClient = server.core.elasticsearch.client.asScoped(fakeRequest);
  const soClient = server.core.savedObjects.getScopedClient(fakeRequest, {
    includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
  });
  return { clusterClient, soClient };
};

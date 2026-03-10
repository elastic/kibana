/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import type { EntityManagerServerSetup } from '../types';
import type { EntityDiscoveryAPIKey } from './auth/api_key/api_key';
import { EntityDiscoveryApiKeyType } from '../saved_objects';

export const getClientsFromAPIKey = ({
  apiKey,
  server,
}: {
  apiKey: EntityDiscoveryAPIKey;
  server: EntityManagerServerSetup;
}): { clusterClient: IScopedClusterClient; soClient: SavedObjectsClientContract } => {
  const fakeRequest = getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey });
  // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
  //   Review and choose one of the following options:
  //   A) Still unsure? Leave this comment as-is.
  //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
  //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
  //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
  const clusterClient = server.core.elasticsearch.client.asScoped(fakeRequest, { projectRouting: 'origin-only' });
  const soClient = server.core.savedObjects.getScopedClient(fakeRequest, {
    includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
  });
  return { clusterClient, soClient };
};

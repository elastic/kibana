/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES_EXTENSION_ID, type CoreSetup } from '@kbn/core/server';

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core/server';

export async function getInternalClients(
  core: CoreSetup
): Promise<[SavedObjectsClientContract, ElasticsearchClient]> {
  return core.getStartServices().then(async ([coreStart]) => {
    const savedObjectsClient = coreStart.savedObjects.getUnsafeInternalClient({
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    return [savedObjectsClient, esClient];
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

export async function fetchIndex(esClient: ElasticsearchClient, index: string) {
  return esClient.search({ index });
}

export async function fetchSavedObjects(
  soClient: SavedObjectsClientContract,
  type: string,
  name: string
) {
  return soClient.find({
    type,
    search: `\"${name}\"`, // Search for phrase
    searchFields: ['name'], // SO type automatically inferred
  });
}

export async function fetchSavedObjectNames(soClient: SavedObjectsClientContract, type: string) {
  return soClient.find({
    type,
    aggs: {
      names: {
        terms: { field: `${type}.attributes.name` }, // cf. SavedObjectsFindOptions definition in packages/core/saved-objects/core-saved-objects-api-server/src/apis/find.ts
      },
    },
  });
}

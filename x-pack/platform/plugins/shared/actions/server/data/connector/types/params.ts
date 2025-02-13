/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsClient } from '@kbn/core/server';

export type SavedObjectClientForFind = Pick<SavedObjectsClient, 'find'>;
export interface SearchConnectorsSoParams {
  kibanaIndices: string[];
  esClient: ElasticsearchClient;
  aggs: Record<string, estypes.AggregationsAggregationContainer>;
}

export interface FindConnectorsSoParams {
  savedObjectsClient: SavedObjectClientForFind;
  namespace?: string;
}

export interface GetConnectorSoParams {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  id: string;
}

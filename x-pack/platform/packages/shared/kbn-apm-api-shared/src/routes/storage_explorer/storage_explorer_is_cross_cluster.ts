/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';

export interface StorageExplorerIsCrossClusterResponse {
  isCrossClusterSearch: boolean;
}

export const storageExplorerIsCrossClusterRoute =
  defineRoute<StorageExplorerIsCrossClusterResponse>()({
    endpoint: 'GET /internal/apm/storage_explorer/is_cross_cluster_search',
  });

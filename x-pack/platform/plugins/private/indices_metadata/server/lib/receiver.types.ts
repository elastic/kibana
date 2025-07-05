/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStream, IlmPolicy, IlmStats, IndexStats } from './indices_metadata_service.types';

export interface IMetadataReceiver {
  setup(): void;
  start(esClient: ElasticsearchClient): void;
  getIndices(): Promise<string[]>;
  getDataStreams(): Promise<DataStream[]>;
  getIndicesStats(indices: string[]): AsyncGenerator<IndexStats, void, unknown>;
  getIlmsStats(indices: string[]): AsyncGenerator<IlmStats, void, unknown>;
  isIlmStatsAvailable(): Promise<boolean>;
  getIlmsPolicies(ilms: string[]): AsyncGenerator<IlmPolicy, void, unknown>;
}

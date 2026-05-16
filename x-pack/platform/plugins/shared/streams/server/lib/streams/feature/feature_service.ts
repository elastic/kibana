/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { DataStreamClient } from '@kbn/data-streams';
import { FeatureClient } from './feature_client';
import { featuresDataStream, type StoredFeatureDoc } from './data_stream';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../common/sig_events_tuning_config';

export class FeatureService {
  constructor(private readonly logger: Logger) {}

  getClient(
    {
      esClient,
    }: {
      esClient: ElasticsearchClient;
    },
    config: Pick<
      SigEventsTuningConfig,
      'feature_ttl_days' | 'semantic_min_score' | 'rrf_rank_constant'
    > = DEFAULT_SIG_EVENTS_TUNING_CONFIG
  ): FeatureClient {
    const dataStreamClient = DataStreamClient.fromDefinition<MappingsDefinition, StoredFeatureDoc>({
      dataStream: featuresDataStream,
      elasticsearchClient: esClient,
    });

    return new FeatureClient(
      {
        dataStreamClient,
        esClient,
        logger: this.logger,
      },
      config
    );
  }
}

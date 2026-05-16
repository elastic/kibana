/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import { featuresDataStream, FEATURES_DATA_STREAM } from './data_stream';
import { upsertDataStream } from '../data_streams/manage_data_streams';

export async function initializeFeaturesTemplate({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  await DataStreamClient.initializeTemplate({
    dataStream: featuresDataStream,
    elasticsearchClient: esClient,
    logger,
  });
  await upsertDataStream({ esClient, name: FEATURES_DATA_STREAM, logger });
}

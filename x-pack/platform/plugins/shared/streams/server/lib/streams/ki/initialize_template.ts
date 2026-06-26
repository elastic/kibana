/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import { knowledgeIndicatorsDataStream } from './data_stream';

/**
 * Install / update the index template for the unified knowledge indicators
 * data stream. Idempotent: subsequent calls with an unchanged definition
 * are no-ops, version bumps trigger a `simulateIndexTemplate` + `putMapping`
 * on the existing write index.
 */
export async function initializeKnowledgeIndicatorsTemplate({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  await DataStreamClient.initializeTemplate({
    dataStream: knowledgeIndicatorsDataStream,
    elasticsearchClient: esClient,
    logger,
  });
}

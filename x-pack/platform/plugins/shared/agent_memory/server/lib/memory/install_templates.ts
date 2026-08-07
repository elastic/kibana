/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DataStreamClient, type AnyDataStreamDefinition } from '@kbn/data-streams';
import { memoriesDataStream } from './data_stream';
import { memoryHistoryDataStream } from './history_data_stream';

export const memoryDataStreamDefinitions: AnyDataStreamDefinition[] = [
  memoriesDataStream,
  memoryHistoryDataStream,
];

/**
 * Create (or upgrade) the index templates and data streams memory writes to.
 *
 * Idempotent — safe to call on every start. Every template is attempted, then a
 * single aggregate error names the ones that failed: swallowing them here would
 * make the caller's install report success while memory is unusable.
 */
export async function installMemoryTemplates({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  const results = await Promise.allSettled(
    memoryDataStreamDefinitions.map((definition) =>
      DataStreamClient.initializeTemplate({
        dataStream: definition,
        elasticsearchClient: esClient,
        logger,
      })
    )
  );

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          `${memoryDataStreamDefinitions[index].name} (${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          })`,
        ]
      : []
  );

  if (failures.length > 0) {
    throw new Error(`Failed to initialize agent memory templates: [${failures.join('; ')}]`);
  }
}

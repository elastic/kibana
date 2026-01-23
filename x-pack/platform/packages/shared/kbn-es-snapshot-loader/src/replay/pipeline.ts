/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';

const TIMESTAMP_TRANSFORM_SCRIPT = `
  if (ctx.containsKey('@timestamp') && ctx['@timestamp'] != null) {
    Instant maxTime = Instant.parse(params.max_timestamp);
    Instant originalTime = Instant.parse(ctx['@timestamp'].toString());
    long deltaMillis = maxTime.toEpochMilli() - originalTime.toEpochMilli();
    Instant now = Instant.ofEpochMilli(System.currentTimeMillis());
    ctx['@timestamp'] = now.minusMillis(deltaMillis).toString();
  }
`;

export async function createTimestampPipeline({
  esClient,
  logger,
  pipelineName,
  maxTimestamp,
}: {
  esClient: Client;
  logger: Logger;
  pipelineName: string;
  maxTimestamp: string;
}): Promise<string> {
  logger.debug(`Creating timestamp transformation pipeline (max: ${maxTimestamp})`);

  try {
    await esClient.ingest.putPipeline({
      id: pipelineName,
      description:
        'Transforms timestamps so the most recent record appears as now, preserving relative timing',
      processors: [
        {
          script: {
            lang: 'painless',
            params: { max_timestamp: maxTimestamp },
            source: TIMESTAMP_TRANSFORM_SCRIPT,
          },
        },
      ],
    });

    logger.debug('Timestamp pipeline created');
    return pipelineName;
  } catch (error) {
    logger.error(`Failed to create timestamp transformation pipeline`);
    throw error;
  }
}

export async function deletePipeline({
  esClient,
  logger,
  pipelineName,
}: {
  esClient: Client;
  logger: Logger;
  pipelineName: string;
}): Promise<void> {
  try {
    await esClient.ingest.deletePipeline({ id: pipelineName });
  } catch (error) {
    logger.debug(`Failed to delete pipeline: ${error}`);
  }
}

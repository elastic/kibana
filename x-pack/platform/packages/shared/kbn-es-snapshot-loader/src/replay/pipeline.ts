/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const timestampTransformBody = (doc: string) => `
  if (${doc}.containsKey('@timestamp') && ${doc}['@timestamp'] != null) {
    Instant maxTime = Instant.parse(params.max_timestamp);
    Instant originalTime = Instant.parse(${doc}['@timestamp'].toString());
    long deltaMillis = maxTime.toEpochMilli() - originalTime.toEpochMilli();
    Instant now = Instant.ofEpochMilli(System.currentTimeMillis());
    ${doc}['@timestamp'] = now.minusMillis(deltaMillis).toString();
  }
`;

// Ingest pipeline version: nulls _id so the destination generates a fresh ID,
// avoiding conflicts when reindexing into a regular index that enforces uniqueness.
const TIMESTAMP_TRANSFORM_SCRIPT = `
  ctx._id = null;
  ${timestampTransformBody('ctx')}
`;

// Inline reindex script version: operates on _source only. Data streams
// auto-generate IDs, so _id manipulation is unnecessary (and unsupported).
export const TIMESTAMP_REINDEX_SCRIPT = timestampTransformBody('ctx._source');

export async function createTimestampPipeline({
  esClient,
  log,
  pipelineName,
  maxTimestamp,
}: {
  esClient: Client;
  log: ToolingLog;
  pipelineName: string;
  maxTimestamp: string;
}): Promise<string> {
  log.debug(`Creating timestamp transformation pipeline (max: ${maxTimestamp})`);

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

    log.debug('Timestamp pipeline created');
    return pipelineName;
  } catch (error) {
    log.error(`Failed to create timestamp transformation pipeline`);
    throw error;
  }
}

export async function deletePipeline({
  esClient,
  log,
  pipelineName,
}: {
  esClient: Client;
  log: ToolingLog;
  pipelineName: string;
}): Promise<void> {
  try {
    await esClient.ingest.deletePipeline({ id: pipelineName });
  } catch (error) {
    log.debug(`Failed to delete pipeline: ${error}`);
  }
}

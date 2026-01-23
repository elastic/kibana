/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ReplayConfig, LoadResult } from '../types';
import {
  extractDataStreamName,
  getMissingDataStreams,
  validateFileSnapshotUrl,
  getErrorMessage,
} from '../utils';
import {
  registerUrlRepository,
  getSnapshotMetadata,
  deleteRepository,
  generateRepoName,
} from '../restore/repository';
import { filterIndicesToRestore, restoreIndices } from '../restore/restore';
import { createTimestampPipeline, deletePipeline } from './pipeline';
import { reindexAllIndices } from './reindex';

export const TEMP_INDEX_PREFIX = 'snapshot-loader-temp-';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

export async function getMaxTimestampFromData({
  esClient,
  logger,
  tempIndices,
}: {
  esClient: Client;
  logger: Logger;
  tempIndices: string[];
}): Promise<string> {
  const indexPattern = tempIndices.join(',');
  const query = `FROM ${indexPattern}
| STATS max_ts = MAX(\`@timestamp\`)
| KEEP max_ts`;

  logger.debug(`Querying max timestamp from restored indices: ${indexPattern}`);

  const response = (await esClient.esql.query({ query })) as unknown as EsqlResponse;

  if (!response.values || response.values.length === 0 || response.values[0][0] == null) {
    throw new Error(
      `No @timestamp found in restored indices. ` +
        `Ensure the data contains documents with a valid @timestamp field.`
    );
  }

  const maxTimestamp = String(response.values[0][0]);
  logger.info(`Derived max timestamp from data: ${maxTimestamp}`);
  return maxTimestamp;
}

export async function replaySnapshot(config: ReplayConfig): Promise<LoadResult> {
  const { esClient, logger, snapshotUrl, snapshotName, patterns, concurrency } = config;

  const result: LoadResult = {
    success: false,
    snapshotName: '',
    restoredIndices: [],
    reindexedIndices: [],
    maxTimestamp: '',
    errors: [],
  };

  const repoName = generateRepoName();
  const pipelineName = `snapshot-loader-timestamp-pipeline-${repoName}`;

  try {
    validateFileSnapshotUrl(snapshotUrl);

    logger.info('Step 1/4: Registering snapshot repository...');
    await registerUrlRepository({ esClient, logger, repoName, snapshotUrl });

    logger.info('Step 2/4: Retrieving snapshot metadata...');
    const snapshotInfo = await getSnapshotMetadata({ esClient, logger, repoName, snapshotName });
    result.snapshotName = snapshotInfo.snapshot;

    const indicesToRestore = filterIndicesToRestore(snapshotInfo.indices, patterns);
    logger.info(
      `Found ${indicesToRestore.length} indices matching patterns: ${patterns.join(', ')}`
    );

    if (indicesToRestore.length === 0) {
      throw new Error(
        `No indices in snapshot match the specified patterns: ${patterns.join(', ')}. ` +
          `Available indices: ${snapshotInfo.indices.slice(0, 10).join(', ')}${
            snapshotInfo.indices.length > 10 ? '...' : ''
          }`
      );
    }

    logger.info('Step 3/4: Restoring to temporary indices...');
    const restoredIndices = await restoreIndices({
      esClient,
      logger,
      repoName,
      snapshotName: snapshotInfo.snapshot,
      indices: indicesToRestore,
      renamePattern: '(.+)',
      renameReplacement: `${TEMP_INDEX_PREFIX}$1`,
    });
    result.restoredIndices = restoredIndices;

    result.maxTimestamp = await getMaxTimestampFromData({
      esClient,
      logger,
      tempIndices: restoredIndices,
    });

    await createTimestampPipeline({
      esClient,
      logger,
      pipelineName,
      maxTimestamp: result.maxTimestamp!,
    });

    logger.info('Step 4/4: Reindexing with timestamp transformation...');
    const reindexedIndices = await reindexAllIndices({
      esClient,
      logger,
      restoredIndices,
      originalIndices: indicesToRestore,
      concurrency,
      pipelineName,
    });
    result.reindexedIndices = reindexedIndices;

    const expectedDataStreams = new Set(
      indicesToRestore
        .map((index) => extractDataStreamName(index))
        .filter((name): name is string => name != null)
    );
    const missingDataStreams = await getMissingDataStreams({
      esClient,
      dataStreamNames: expectedDataStreams,
    });

    if (missingDataStreams.length > 0) {
      logger.warn(
        `Some expected data streams were not created: ${missingDataStreams.join(', ')}. ` +
          `Replay may have created regular indices instead. ` +
          `Ensure the cluster contains a matching index template with data streams enabled. ` +
          `To check: GET _index_template/*?filter_path=index_templates.name,index_templates.index_template.index_patterns,index_templates.index_template.data_stream`
      );
    }

    result.success = reindexedIndices.length > 0;

    logger.info(
      `Replay completed: ${reindexedIndices.length}/${indicesToRestore.length} indices reindexed successfully`
    );
  } catch (error) {
    result.errors.push(getErrorMessage(error));
    logger.error(`Snapshot replay failed: ${getErrorMessage(error)}`);
  } finally {
    logger.debug('Cleaning up...');
    await cleanup({
      esClient,
      logger,
      repoName,
      pipelineName,
      restoredIndices: result.restoredIndices,
    });
  }

  return result;
}

async function cleanup({
  esClient,
  logger,
  repoName,
  pipelineName,
  restoredIndices,
}: {
  esClient: Client;
  logger: Logger;
  repoName: string;
  pipelineName: string;
  restoredIndices: string[];
}): Promise<void> {
  for (const index of restoredIndices) {
    try {
      await esClient.indices.delete({ index, ignore_unavailable: true });
    } catch {
      logger.debug(`Failed to delete temp index: ${index}`);
    }
  }
  await deletePipeline({ esClient, logger, pipelineName });
  await deleteRepository({ esClient, logger, repoName });
}

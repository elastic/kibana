/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { getErrorMessage } from '../utils';
import { getDestinationInfo } from './reindex';

/**
 * Creates each destination data stream and copies the restored indices' mappings onto it, so field
 * types that only the original writer knew (TSDB counters, histograms) survive the reindex.
 */
export async function copySourceMappings({
  esClient,
  log,
  restoredIndices,
  originalIndices,
}: {
  esClient: Client;
  log: ToolingLog;
  restoredIndices: string[];
  originalIndices: string[];
}): Promise<void> {
  const sourcesByDestination = new Map<string, string[]>();
  restoredIndices.forEach((restored, i) => {
    const { destIndex, isDataStream } = getDestinationInfo(originalIndices[i]);
    if (!isDataStream) {
      return;
    }
    sourcesByDestination.set(destIndex, [...(sourcesByDestination.get(destIndex) ?? []), restored]);
  });

  for (const [dataStream, sources] of sourcesByDestination) {
    await ensureDataStream({ esClient, log, dataStream });
    for (const source of sources) {
      // An empty write index has constant_keyword fields without values, which conflict with populated ones.
      const { count } = await esClient.count({ index: source });
      if (count === 0) {
        continue;
      }
      const response = await esClient.indices.getMapping({ index: source });
      const properties = response[source]?.mappings?.properties;
      if (!properties || Object.keys(properties).length === 0) {
        continue;
      }
      log.debug(
        `Copying ${
          Object.keys(properties).length
        } top-level mappings from ${source} to ${dataStream}`
      );
      try {
        await esClient.indices.putMapping({
          index: dataStream,
          properties,
          write_index_only: true,
        });
      } catch (error) {
        throw new Error(
          `Failed to copy mappings from ${source} to ${dataStream}: ${getErrorMessage(error)}`
        );
      }
    }
  }
}

async function ensureDataStream({
  esClient,
  log,
  dataStream,
}: {
  esClient: Client;
  log: ToolingLog;
  dataStream: string;
}): Promise<void> {
  try {
    await esClient.indices.createDataStream({ name: dataStream });
    log.debug(`Created data stream ${dataStream}`);
  } catch (error) {
    if (getErrorMessage(error).includes('resource_already_exists_exception')) {
      return;
    }
    throw error;
  }
}

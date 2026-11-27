/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getResolutionRunsDataStreamName } from '../../../asset_manager/resolution_runs_data_stream';

/**
 * How many rule runs failed in the past 24 hours, from the run stream. Returns `null` when the
 * stream cannot be read (it does not exist yet, or the user may not read it), so a caller can tell
 * "no failures" from "could not tell".
 */
export const countRecentFailedRuns = async ({
  esClient,
  namespace,
  logger,
}: {
  esClient: ElasticsearchClient;
  namespace: string;
  logger: Logger;
}): Promise<number | null> => {
  try {
    const { count } = await esClient.count({
      index: getResolutionRunsDataStreamName(namespace),
      query: {
        bool: {
          filter: [
            { term: { 'event.outcome': 'failure' } },
            { range: { '@timestamp': { gte: 'now-24h' } } },
          ],
        },
      },
    });
    return count;
  } catch (error) {
    logger.debug(`Could not count recent failed resolution runs: ${error}`);
    return null;
  }
};

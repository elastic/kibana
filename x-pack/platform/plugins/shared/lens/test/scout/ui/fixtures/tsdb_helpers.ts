/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

export const TSDB_DATA_VIEW_ID = '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51';
export const TSDB_INDEX = 'kibana_sample_data_logstsdb';
export const TSDB_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb';
export const TSDB_TIME_RANGE = {
  from: 'Apr 16, 2023 @ 00:00:00.000',
  to: 'Jun 16, 2023 @ 00:00:00.000',
} as const;

export const ROLLED_UP_MEDIAN_WARNING =
  'Median of bytes_gauge uses a function that is unsupported by rolled up data. Select a different function or change the time range.';

export interface DownsampleTSDBIndexOptions {
  isStream: boolean;
  interval?: string;
  deleteOriginal?: boolean;
}

export async function downsampleTSDBIndex(
  esClient: Client,
  indexOrStream: string,
  { isStream, interval = '1h', deleteOriginal = false }: DownsampleTSDBIndexOptions
): Promise<string> {
  let sourceIndex = indexOrStream;

  if (isStream) {
    const rolloverResponse = await esClient.indices.rollover({ alias: indexOrStream });
    sourceIndex = rolloverResponse.old_index;
  }

  const downsampledTargetIndex = `${indexOrStream}_downsampled`;
  await esClient.indices.addBlock({ index: sourceIndex, block: 'write' });

  await esClient.indices.downsample({
    index: sourceIndex,
    target_index: downsampledTargetIndex,
    config: { fixed_interval: interval },
  });

  if (deleteOriginal) {
    await esClient.indices.delete({ index: sourceIndex });
  }

  return downsampledTargetIndex;
}

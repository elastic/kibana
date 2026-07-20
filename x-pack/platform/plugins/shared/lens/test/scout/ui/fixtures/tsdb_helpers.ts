/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';

export const TSDB_DATA_VIEW_ID = '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51';
export const TSDB_DOWNSAMPLED_DATA_VIEW_ID = 'lens-tsdb-downsampled-data-view';
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

export interface TsdbHelper {
  downsampleTSDBIndex: (
    indexOrStream: string,
    options: DownsampleTSDBIndexOptions
  ) => Promise<string>;
}

interface LensUiWorkerFixtures extends ScoutWorkerFixtures {
  tsdbHelper: TsdbHelper;
}

const DOWNSAMPLE_RETRY_TIMEOUT = 15_000;
const DOWNSAMPLE_INITIAL_RETRY_DELAY = 1_000;
const DOWNSAMPLE_RETRY_BACKOFF = 1.5;

const sleep = async (duration: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, duration));

const retryDownsample = async (downsample: () => Promise<void>): Promise<void> => {
  const deadline = Date.now() + DOWNSAMPLE_RETRY_TIMEOUT;
  let retryDelay = DOWNSAMPLE_INITIAL_RETRY_DELAY;

  while (true) {
    await sleep(retryDelay);

    try {
      await downsample();
      return;
    } catch (error) {
      // A previous attempt may have created the target before reporting a transient failure.
      if (error instanceof Error && /resource_already_exists_exception/.test(error.message)) {
        return;
      }

      retryDelay *= DOWNSAMPLE_RETRY_BACKOFF;
      if (Date.now() + retryDelay >= deadline) {
        throw error;
      }
    }
  }
};

export const test = baseTest.extend<ScoutTestFixtures, LensUiWorkerFixtures>({
  tsdbHelper: [
    async ({ esClient, log }, use) => {
      const downsampleTSDBIndex: TsdbHelper['downsampleTSDBIndex'] = async (
        indexOrStream,
        { isStream, interval = '1h', deleteOriginal = false }
      ) => {
        let sourceIndex = indexOrStream;

        // Block and downsample only work at index level, so a data stream must be rolled over
        // first to resolve its previous backing index.
        if (isStream) {
          log.info(
            `Force a rollover for the "${indexOrStream}" data stream to get the backing index`
          );
          const rolloverResponse = await esClient.indices.rollover({ alias: indexOrStream });
          sourceIndex = rolloverResponse.old_index;
        }

        const downsampledTargetIndex = `${indexOrStream}_downsampled`;
        log.info(`Adding a write block to the "${sourceIndex}" index`);
        await esClient.indices.addBlock({ index: sourceIndex, block: 'write' });

        log.info(`Downsampling the "${sourceIndex}" index into "${downsampledTargetIndex}"`);
        // Downsampling can race with the write block becoming effective and fail with a transient
        // null_pointer_exception. Preserve the bounded retry used by the migrated FTR service.
        await retryDownsample(async () => {
          await esClient.indices.downsample({
            index: sourceIndex,
            target_index: downsampledTargetIndex,
            config: { fixed_interval: interval },
          });
        });

        if (deleteOriginal) {
          log.info(`Deleting the original "${sourceIndex}" index`);
          await esClient.indices.delete({ index: sourceIndex });
        }

        return downsampledTargetIndex;
      };

      await use({ downsampleTSDBIndex });
    },
    { scope: 'worker' },
  ],
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import type { LensPageObjects, LensTestFixtures } from '../../../common/ui/fixtures';
import { test as lensTest } from '../../../common/ui/fixtures';

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

export const TSDB_SCENARIO_DOCUMENT_COUNT = 100;

export interface TsdbScenarioContext {
  page: ScoutTestFixtures['page'];
  pageObjects: LensPageObjects;
  tsdbScenario: TsdbScenario;
}

export const sumFirstNValues = (count: number, bars: Array<{ y: number }> | undefined): number =>
  (bars ?? []).slice(0, count).reduce((sum, bar) => sum + bar.y, 0);

const PICKER_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

/** Offsets a time string by the given milliseconds and returns a picker-formatted string. */
export const offsetPickerTime = (time: string, milliseconds: number): string =>
  moment.utc(time).add(milliseconds, 'milliseconds').format(PICKER_FORMAT);

export interface DownsampleTSDBIndexOptions {
  isStream: boolean;
  interval?: string;
  deleteOriginal?: boolean;
}

export interface TsdbScenarioIndex {
  index: string;
  create?: boolean;
  downsample?: boolean;
  removeTSDBFields?: boolean;
  mode?: 'tsdb';
}

export interface TsdbScenarioTimeRange {
  beforeRollover: string;
  afterRollover: string;
  picker: {
    from: string;
    to: string;
  };
}

interface CleanupHandle {
  cleanup: () => Promise<void>;
}

interface TsdbScenarioSetup extends CleanupHandle {
  dataViewTitle: string;
  expectedDocumentCountBeforeRollover: number;
}

export interface TsdbHelper {
  downsampleTSDBIndex: (
    indexOrStream: string,
    options: DownsampleTSDBIndexOptions
  ) => Promise<string>;
  createUpgradedStream: (
    stream: string,
    timeRange: TsdbScenarioTimeRange
  ) => Promise<CleanupHandle>;
  createDowngradedStream: (
    stream: string,
    timeRange: TsdbScenarioTimeRange
  ) => Promise<CleanupHandle>;
  setupScenario: (
    initialIndex: string,
    indexes: TsdbScenarioIndex[],
    beforeRollover: string
  ) => Promise<TsdbScenarioSetup>;
}

export interface TsdbScenario {
  setup: (
    initialIndex: string,
    indexes: TsdbScenarioIndex[],
    timeRange: TsdbScenarioTimeRange
  ) => Promise<{ expectedDocumentCountBeforeRollover: number }>;
}

interface LensUiTestFixtures extends LensTestFixtures {
  tsdbScenario: TsdbScenario;
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

export const createTsdbScenarioTimeRange = (now = Date.now()): TsdbScenarioTimeRange => ({
  beforeRollover: new Date(now - 60 * 60 * 1000).toISOString(),
  afterRollover: new Date(now).toISOString(),
  picker: {
    from: new Date(now - 60 * 60 * 1000).toISOString(),
    to: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
  },
});

const runCleanupActions = async (
  description: string,
  actions: Array<() => Promise<void>>
): Promise<void> => {
  const errors: Error[] = [];
  for (const action of actions) {
    try {
      await action();
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, `Failed to clean up ${description}`);
  }
};

const getTsdbMapping = ({
  removeTSDBFields = false,
  includeTimeSeriesMetadata = true,
}: {
  removeTSDBFields?: boolean;
  includeTimeSeriesMetadata?: boolean;
} = {}): Record<string, MappingProperty> => ({
  '@timestamp': { type: 'date' },
  request: {
    type: 'keyword',
    ...(includeTimeSeriesMetadata ? { time_series_dimension: true } : {}),
  },
  ...(removeTSDBFields
    ? {}
    : {
        bytes_counter: {
          type: 'long',
          ...(includeTimeSeriesMetadata ? { time_series_metric: 'counter' as const } : {}),
        },
      }),
});

/**
 * Non-parallel counterpart of `spaceTest`, for suites that need a clean, dedicated ES state.
 * Also the single source of the `tsdbHelper`/`tsdbScenario` fixtures used by the TSDB specs;
 * kept here (rather than duplicated in `./index.ts`) so `export *` doesn't have to pick between
 * two same-named `test` exports.
 */
export const test = lensTest.extend<LensUiTestFixtures, LensUiWorkerFixtures>({
  tsdbHelper: [
    async ({ esClient, log }, use) => {
      const deleteDataStream = async (stream: string): Promise<void> => {
        await runCleanupActions(`data stream "${stream}"`, [
          async () => {
            await esClient.indices.deleteDataStream({ name: stream }, { ignore: [404] });
          },
          async () => {
            await esClient.indices.deleteIndexTemplate(
              { name: `${stream}_index_template` },
              { ignore: [404] }
            );
          },
          async () => {
            await esClient.cluster.deleteComponentTemplate(
              { name: `${stream}_mapping` },
              { ignore: [404] }
            );
          },
        ]);
      };

      const putDataStreamTemplate = async (
        stream: string,
        mode: 'tsdb' | undefined,
        { includeTimeSeriesMetadata = true }: { includeTimeSeriesMetadata?: boolean } = {}
      ): Promise<void> => {
        await esClient.cluster.putComponentTemplate({
          name: `${stream}_mapping`,
          template: {
            ...(mode === 'tsdb'
              ? {
                  settings: {
                    mode: 'time_series',
                    routing_path: ['request'],
                  },
                }
              : {}),
            mappings: {
              properties: getTsdbMapping({ includeTimeSeriesMetadata }),
            },
          },
        });
        await esClient.indices.putIndexTemplate({
          name: `${stream}_index_template`,
          index_patterns: [stream],
          data_stream: {},
          composed_of: [`${stream}_mapping`],
          _meta: {
            description: `Template for Lens TSDB test stream ${stream}`,
          },
        });
      };

      const createDataStream = async (stream: string, mode: 'tsdb' | undefined): Promise<void> => {
        await putDataStreamTemplate(stream, mode);
        await esClient.indices.createDataStream({ name: stream });
      };

      const createDocs = async (
        index: string,
        startTime: string,
        { isStream, removeTSDBFields = false }: { isStream: boolean; removeTSDBFields?: boolean }
      ): Promise<void> => {
        const startTimeMs = Date.parse(startTime);
        const documents = Array.from(
          { length: TSDB_SCENARIO_DOCUMENT_COUNT },
          (_, indexOffset) => ({
            '@timestamp': new Date(
              startTimeMs + (TSDB_SCENARIO_DOCUMENT_COUNT + indexOffset) * 1000
            ).toISOString(),
            request: `/lens-tsdb-test/${indexOffset % 5}`,
            ...(removeTSDBFields ? {} : { bytes_counter: 5000 }),
          })
        );
        const response = await esClient.bulk({
          index,
          refresh: 'wait_for',
          operations: documents.flatMap((document) => [
            isStream ? { create: {} } : { index: {} },
            document,
          ]),
        });
        if (response.errors) {
          const failures = response.items.flatMap((item) => {
            const result = item.create ?? item.index;
            return result?.error ? [result.error] : [];
          });
          throw new Error(`Failed to index TSDB scenario documents: ${JSON.stringify(failures)}`);
        }
      };

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

      const createUpgradedStream: TsdbHelper['createUpgradedStream'] = async (
        stream,
        timeRange
      ) => {
        const cleanup = async () => deleteDataStream(stream);
        try {
          log.info(`Creating regular data stream "${stream}"`);
          await createDataStream(stream, undefined);
          await createDocs(stream, timeRange.beforeRollover, { isStream: true });

          log.info(`Upgrading data stream "${stream}" to TSDB`);
          await putDataStreamTemplate(stream, 'tsdb');
          await esClient.indices.rollover({ alias: stream });
          await createDocs(stream, timeRange.afterRollover, { isStream: true });

          return { cleanup };
        } catch (error) {
          await cleanup();
          throw error;
        }
      };

      const createDowngradedStream: TsdbHelper['createDowngradedStream'] = async (
        stream,
        timeRange
      ) => {
        const cleanup = async () => deleteDataStream(stream);
        try {
          log.info(`Creating TSDB data stream "${stream}"`);
          await createDataStream(stream, 'tsdb');
          await createDocs(stream, timeRange.beforeRollover, { isStream: true });

          log.info(`Downgrading data stream "${stream}" to a regular data stream`);
          await putDataStreamTemplate(stream, undefined, { includeTimeSeriesMetadata: false });
          await esClient.indices.rollover({ alias: stream });
          await createDocs(stream, timeRange.afterRollover, { isStream: true });

          return { cleanup };
        } catch (error) {
          await cleanup();
          throw error;
        }
      };

      const setupScenario: TsdbHelper['setupScenario'] = async (
        initialIndex,
        indexes,
        beforeRollover
      ) => {
        const cleanupActions: Array<() => Promise<void>> = [];
        let downsampledTargetIndex = '';

        const cleanup = async () =>
          runCleanupActions(`TSDB scenario for "${initialIndex}"`, [...cleanupActions].reverse());

        try {
          for (const { index, create, downsample, removeTSDBFields, mode } of indexes) {
            if (!create) {
              continue;
            }
            if (mode === 'tsdb') {
              cleanupActions.push(async () => deleteDataStream(index));
              await createDataStream(index, 'tsdb');
              await createDocs(index, beforeRollover, { isStream: true, removeTSDBFields });
            } else {
              cleanupActions.push(async () => {
                await esClient.indices.delete({ index }, { ignore: [404] });
              });
              await esClient.indices.create({
                index,
                mappings: {
                  properties: getTsdbMapping({ removeTSDBFields }),
                },
              });
              await createDocs(index, beforeRollover, { isStream: false, removeTSDBFields });
            }

            if (downsample) {
              const targetIndex = `${index}_downsampled`;
              downsampledTargetIndex = targetIndex;
              cleanupActions.push(async () => {
                await esClient.indices.delete({ index: targetIndex }, { ignore: [404] });
              });
              await downsampleTSDBIndex(index, {
                isStream: mode === 'tsdb',
              });
            }
          }

          return {
            dataViewTitle: `${indexes.map(({ index }) => index).join(',')}${
              downsampledTargetIndex ? `,${downsampledTargetIndex}` : ''
            }`,
            // Lens count aggregation treats the downsample target as the stream's rolled-up data;
            // it does not add another logical source contribution for that target.
            expectedDocumentCountBeforeRollover: indexes.length * TSDB_SCENARIO_DOCUMENT_COUNT,
            cleanup,
          };
        } catch (error) {
          await cleanup();
          throw error;
        }
      };

      await use({
        downsampleTSDBIndex,
        createUpgradedStream,
        createDowngradedStream,
        setupScenario,
      });
    },
    { scope: 'worker' },
  ],
  tsdbScenario: async ({ apiServices, tsdbHelper, uiSettings }, use) => {
    const dataViewIds: string[] = [];
    const scenarioCleanups: Array<() => Promise<void>> = [];

    const setup: TsdbScenario['setup'] = async (initialIndex, indexes, timeRange) => {
      const scenario = await tsdbHelper.setupScenario(
        initialIndex,
        indexes,
        timeRange.beforeRollover
      );
      try {
        const { data: dataView } = await apiServices.dataViews.create({
          title: scenario.dataViewTitle,
          timeFieldName: '@timestamp',
        });
        dataViewIds.push(dataView.id);
        scenarioCleanups.push(scenario.cleanup);
        await uiSettings.set({
          'dateFormat:tz': 'UTC',
          defaultIndex: dataView.id,
          'timepicker:timeDefaults': JSON.stringify(timeRange.picker),
        });
        return {
          expectedDocumentCountBeforeRollover: scenario.expectedDocumentCountBeforeRollover,
        };
      } catch (error) {
        await scenario.cleanup();
        throw error;
      }
    };

    try {
      await use({ setup });
    } finally {
      await runCleanupActions('TSDB scenario fixture', [
        ...dataViewIds.map((dataViewId) => async () => {
          await apiServices.dataViews.delete(dataViewId);
        }),
        async () => {
          await uiSettings.unset('dateFormat:tz', 'defaultIndex', 'timepicker:timeDefaults');
        },
        ...[...scenarioCleanups].reverse(),
      ]);
    }
  },
});

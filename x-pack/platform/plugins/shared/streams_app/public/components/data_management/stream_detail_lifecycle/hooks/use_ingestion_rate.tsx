/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { getCalculateAutoTimeExpression } from '@kbn/data-plugin/common';
import { TimeState } from '@kbn/es-query';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { Streams, PhaseName } from '@kbn/streams-schema';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { DataStreamStats } from './use_data_stream_stats';
import { useIlmPhasesColorAndDescription } from './use_ilm_phases_color_and_description';

const TIMESTAMP_FIELD = '@timestamp';
const RANDOM_SAMPLER_PROBABILITY = 0.1;

// some units are not supported for the fixed_interval of the date histogram
// this function uses the calculateAutoTimeExpression function to determine
// if the interval should be a calendar_interval or a fixed_interval
const getIntervalAndType = (
  timeState: TimeState,
  core: { uiSettings: { get: (key: string) => any } }
): { interval: string; intervalType: string } | undefined => {
  const interval = getCalculateAutoTimeExpression((key) => core.uiSettings.get(key))(
    timeState.asAbsoluteTimeRange
  );

  if (!interval) {
    return undefined;
  }

  const calendarIntervalUnits = new Set(['w', 'M', 'q', 'y']);

  const intervalType = calendarIntervalUnits.has(interval.replace(/^\d+/, ''))
    ? 'calendar_interval'
    : 'fixed_interval';

  return { interval, intervalType };
};

export const useIngestionRate = ({
  definition,
  stats,
  timeState,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  timeState: TimeState;
}) => {
  const {
    core,
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const ingestionRateFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!stats) {
        return;
      }

      const intervalData = getIntervalAndType(timeState, core);
      if (!intervalData) {
        return;
      }
      const { interval, intervalType } = intervalData;

      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<
          IKibanaSearchRequest,
          IKibanaSearchResponse<{
            aggregations: {
              sampler: { docs_count: { buckets: Array<{ key: number; doc_count: number }> } };
            };
          }>
        >(
          {
            params: {
              index: definition.stream.name,
              track_total_hits: false,
              body: {
                size: 0,
                query: {
                  bool: {
                    filter: [
                      {
                        range: {
                          [TIMESTAMP_FIELD]: {
                            gte: timeState.start,
                            lte: timeState.end,
                          },
                        },
                      },
                    ],
                  },
                },
                aggs: {
                  sampler: {
                    random_sampler: {
                      probability: RANDOM_SAMPLER_PROBABILITY,
                      seed: 42,
                    },
                    aggs: {
                      docs_count: {
                        date_histogram: {
                          field: TIMESTAMP_FIELD,
                          [intervalType]: interval,
                          min_doc_count: 0,
                          extended_bounds: { min: timeState.start, max: timeState.end },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          { abortSignal: signal }
        )
      );

      return {
        start: moment(timeState.start),
        end: moment(timeState.end),
        interval,
        buckets: aggregations.sampler.docs_count.buckets.map(({ key, doc_count: docCount }) => ({
          key,
          value: docCount * stats.bytesPerDoc,
        })),
      };
    },
    [definition, stats, timeState, core, data.search]
  );

  return {
    ingestionRate: ingestionRateFetch.value,
    isLoading: ingestionRateFetch.loading,
    error: ingestionRateFetch.error,
  };
};

type PhaseNameWithoutDelete = Exclude<PhaseName, 'delete'>;

export const useIngestionRatePerTier = ({
  definition,
  stats,
  timeState,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  timeState: TimeState;
}) => {
  const {
    core,
    dependencies: {
      start: {
        data,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { ilmPhases } = useIlmPhasesColorAndDescription();

  const ingestionRateFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!stats) {
        return;
      }

      const intervalData = getIntervalAndType(timeState, core);

      if (!timeState.start || !timeState.end || !intervalData) {
        return;
      }

      const start = moment(timeState.start);
      const end = moment(timeState.end);

      const { interval, intervalType } = intervalData;

      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<
          IKibanaSearchRequest,
          IKibanaSearchResponse<{
            aggregations: {
              sampler: {
                docs_count: {
                  buckets: Array<{
                    key: number;
                    doc_count: number;
                    indices: { buckets: Array<{ key: string; doc_count: number }> };
                  }>;
                };
              };
            };
          }>
        >(
          {
            params: {
              index: definition.stream.name,
              track_total_hits: false,
              body: {
                size: 0,
                query: {
                  bool: {
                    filter: [{ range: { [TIMESTAMP_FIELD]: { gte: start, lte: end } } }],
                  },
                },
                aggs: {
                  sampler: {
                    random_sampler: {
                      probability: RANDOM_SAMPLER_PROBABILITY,
                      seed: 42,
                    },
                    aggs: {
                      docs_count: {
                        date_histogram: {
                          field: TIMESTAMP_FIELD,
                          [intervalType]: interval,
                          min_doc_count: 0,
                          extended_bounds: { min: start, max: end },
                        },
                        aggs: {
                          indices: {
                            terms: { field: '_index' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          { abortSignal: signal }
        )
      );

      if (aggregations.sampler.docs_count.buckets.length === 0) {
        return { start, end, interval, buckets: {} };
      }

      const ilmExplain = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/lifecycle/_explain',
        {
          params: { path: { name: definition.stream.name } },
          signal,
        }
      );

      const fallbackTier = 'hot';
      const buckets = aggregations.sampler.docs_count.buckets.reduce(
        (acc, { key, doc_count: docCount, indices }) => {
          if (docCount === 0) {
            // there's no data for this bucket. push an empty data point
            // so we still graph the timestamp.
            (acc[fallbackTier] = acc[fallbackTier] ?? []).push({ key, value: 0 });
            return acc;
          }

          const countByTier = indices.buckets.reduce((tiers, index) => {
            const explain = ilmExplain.indices[index.key];
            const tier =
              explain.managed && explain.phase && explain.phase in ilmPhases
                ? (explain.phase as PhaseNameWithoutDelete)
                : fallbackTier;
            tiers[tier] = (tiers[tier] ?? 0) + index.doc_count;
            return tiers;
          }, {} as Record<PhaseNameWithoutDelete, number>);

          for (const entry of Object.entries(countByTier)) {
            const tier = entry[0] as PhaseNameWithoutDelete;
            (acc[tier] = acc[tier] ?? []).push({ key, value: entry[1] * stats.bytesPerDoc });
          }

          return acc;
        },
        {} as Record<PhaseNameWithoutDelete, Array<{ key: number; value: number }>>
      );

      return { start, end, interval, buckets };
    },
    [definition, stats, timeState, core, data.search, streamsRepositoryClient, ilmPhases]
  );

  return {
    ingestionRate: ingestionRateFetch.value,
    isLoading: ingestionRateFetch.loading,
    error: ingestionRateFetch.error,
  };
};

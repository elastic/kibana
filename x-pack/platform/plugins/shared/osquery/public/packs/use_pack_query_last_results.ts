/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import moment from 'moment-timezone';
import { lastValueFrom } from 'rxjs';
import { SortDirection } from '@kbn/data-plugin/common';
import { useKibana } from '../common/lib/kibana';
import { useLogsDataView } from '../common/hooks/use_logs_data_view';

interface PerExecutionBucket {
  key: number;
  doc_count: number;
  max_ingested?: { value: number | null; value_as_string?: string };
  unique_agents?: { value: number };
}

interface SchedulePerExecutionAggregations {
  per_execution?: { buckets: PerExecutionBucket[] };
}

interface UsePackQueryLastResultsProps {
  actionId?: string;
  agentIds?: string[];
  interval?: number;
  skip?: boolean;
  startDate?: string;
  endDate?: string;
  scheduleId?: string;
}

// Defensive upper bound on the schedule branch's ES query.
const SCHEDULE_LOOKBACK = 'now-30d';

/**
 * Fetches the most recent execution metadata for a pack query.
 *
 * If `scheduleId` is provided, the schedule branch runs first. It uses a single
 * `terms` agg over `osquery_meta.schedule_execution_count` (scoped to the last
 * 30 days via `SCHEDULE_LOOKBACK`) to pull the most recent execution's metadata
 * in one round-trip. The `startDate` / `endDate` props do not apply to this
 * branch — the latest execution is found by ordering on `event.ingested`.
 *
 * If the schedule branch finds no buckets (legacy packs whose docs still carry
 * `action_id`, or environments mid-migration), we fall back to the legacy
 * `actionId` branch — one search for the latest hit, one aggregation for
 * `unique_agents` / `docCount`. The `startDate` / `endDate` props apply to
 * that branch only.
 */
export const usePackQueryLastResults = ({
  actionId,
  interval,
  startDate,
  endDate,
  skip = false,
  scheduleId,
}: UsePackQueryLastResultsProps) => {
  const data = useKibana().services.data;
  const { data: logsDataView } = useLogsDataView({ skip });

  return useQuery(
    ['scheduledQueryLastResults', { actionId, scheduleId }],
    async () => {
      if (scheduleId) {
        const scheduleSearchSource = await data.search.searchSource.create({
          size: 0,
          query: {
            // @ts-expect-error update types
            bool: {
              filter: [
                { term: { schedule_id: scheduleId } },
                { range: { 'event.ingested': { gte: SCHEDULE_LOOKBACK } } },
              ],
            },
          },
        });

        scheduleSearchSource.setField('index', logsDataView);
        scheduleSearchSource.setField('aggs', {
          per_execution: {
            terms: {
              field: 'osquery_meta.schedule_execution_count',
              size: 1,
              // Order by sub-agg max_ingested to get the most recent execution
              // bucket. shard_size widens the per-shard candidate set so the
              // ordering stays accurate when results are spread across many
              // shards (typical for pack result indices that roll over).
              shard_size: 100,
              order: { max_ingested: 'desc' },
            },
            aggs: {
              max_ingested: { max: { field: 'event.ingested' } },
              unique_agents: { cardinality: { field: 'agent.id' } },
            },
          },
        });

        const scheduleResponse = await lastValueFrom(scheduleSearchSource.fetch$());
        const aggregations = scheduleResponse?.rawResponse?.aggregations as
          | SchedulePerExecutionAggregations
          | undefined;
        const buckets = aggregations?.per_execution?.buckets;

        if (buckets?.length) {
          const bucket = buckets[0];

          return {
            lastResultTime: bucket.max_ingested?.value_as_string
              ? [bucket.max_ingested.value_as_string]
              : undefined,
            uniqueAgentsCount: bucket.unique_agents?.value,
            docCount: bucket.doc_count,
            // Bucket key is the value of `osquery_meta.schedule_execution_count`
            // for the most recent execution. Callers (e.g. View in Discover/Lens)
            // use this to scope link filters to exactly that execution.
            executionCount: bucket.key,
          };
        }

        // Schedule branch found nothing — fall through to actionId branch so
        // legacy docs still surface. `executionCount` stays undefined, which
        // signals callers to keep the legacy `action_id` link/title.
      }

      if (!actionId) return null;

      const lastResultsSearchSource = await data.search.searchSource.create({
        size: 1,
        sort: [{ 'event.ingested': SortDirection.desc }],
        query: {
          // @ts-expect-error update types
          bool: {
            filter: [
              {
                match_phrase: {
                  action_id: actionId,
                },
              },
            ],
          },
        },
      });

      lastResultsSearchSource.setField('index', logsDataView);

      const lastResultsResponse = await lastValueFrom(lastResultsSearchSource.fetch$());
      const eventIngested =
        lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['event.ingested']?.[0];

      if (eventIngested) {
        const aggsSearchSource = await data.search.searchSource.create({
          size: 1,
          query: {
            // @ts-expect-error update types
            bool: {
              filter: [
                {
                  range: {
                    'event.ingested': {
                      gte: startDate
                        ? moment(startDate).format()
                        : moment(eventIngested).subtract(interval, 'seconds').format(),
                      lte: moment(endDate || eventIngested).format(),
                    },
                  },
                },
                {
                  match_phrase: {
                    action_id: actionId,
                  },
                },
              ],
            },
          },
        });

        aggsSearchSource.setField('index', logsDataView);
        aggsSearchSource.setField('aggs', {
          unique_agents: { cardinality: { field: 'agent.id' } },
        });
        const aggsResponse = await lastValueFrom(aggsSearchSource.fetch$());

        return {
          lastResultTime:
            lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['event.ingested'],
          // @ts-expect-error update types
          uniqueAgentsCount: aggsResponse?.rawResponse.aggregations?.unique_agents?.value,
          docCount: aggsResponse?.rawResponse?.hits?.total,
        };
      }

      return null;
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && (actionId || scheduleId) && logsDataView),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

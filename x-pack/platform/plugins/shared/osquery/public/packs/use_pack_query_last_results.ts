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

interface UsePackQueryLastResultsProps {
  /**
   * Live-query action UUID (from Fleet). Used by ad-hoc query result lookups.
   */
  actionId?: string;
  /**
   * Stable scheduled-query UUID (set on every result doc by the agent) — used
   * by the pack-detail status table to look up scheduled-query results
   * regardless of schedule mode (interval or rrule).
   */
  scheduleId?: string;
  agentIds?: string[];
  interval?: number;
  skip?: boolean;
  startDate?: string;
  endDate?: string;
}

export const usePackQueryLastResults = ({
  actionId,
  scheduleId,
  interval,
  startDate,
  endDate,
  skip = false,
}: UsePackQueryLastResultsProps) => {
  const data = useKibana().services.data;
  const { data: logsDataView } = useLogsDataView({ skip });

  return useQuery(
    ['scheduledQueryLastResults', { actionId, scheduleId }],
    async () => {
      // Two paths:
      //   - scheduleId: scheduled-query results (interval and rrule). The
      //     last-execution doc/agent counts come from a single
      //     `schedule_id + osquery_meta.schedule_execution_count` slice — no
      //     time range needed and the legacy pack-level `interval` (which can
      //     be stale on rrule packs) is ignored.
      //   - actionId: live-query results. We keep the original
      //     time-window-around-`event.ingested` strategy because live results
      //     don't carry `schedule_execution_count`.
      if (scheduleId) {
        const lastResultsSearchSource = await data.search.searchSource.create({
          size: 1,
          sort: [{ 'event.ingested': SortDirection.desc }],
          query: {
            // @ts-expect-error update types
            bool: {
              filter: [{ match_phrase: { schedule_id: scheduleId } }],
            },
          },
          fields: ['event.ingested', 'osquery_meta.schedule_execution_count'],
        });

        lastResultsSearchSource.setField('index', logsDataView);

        const lastResultsResponse = await lastValueFrom(lastResultsSearchSource.fetch$());
        const latestHit = lastResultsResponse.rawResponse?.hits?.hits[0];
        const eventIngested = latestHit?.fields?.['event.ingested'];
        const latestExecutionCount =
          latestHit?.fields?.['osquery_meta.schedule_execution_count']?.[0];

        if (!eventIngested || latestExecutionCount === undefined) {
          return null;
        }

        const aggsSearchSource = await data.search.searchSource.create({
          size: 0,
          query: {
            // @ts-expect-error update types
            bool: {
              filter: [
                { match_phrase: { schedule_id: scheduleId } },
                {
                  match_phrase: {
                    'osquery_meta.schedule_execution_count': latestExecutionCount,
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
          lastResultTime: eventIngested,
          // @ts-expect-error update types
          uniqueAgentsCount: aggsResponse?.rawResponse.aggregations?.unique_agents?.value,
          docCount: aggsResponse?.rawResponse?.hits?.total,
        };
      }

      if (!actionId) return null;

      const lastResultsSearchSource = await data.search.searchSource.create({
        size: 1,
        sort: [{ 'event.ingested': SortDirection.desc }],
        query: {
          // @ts-expect-error update types
          bool: {
            filter: [{ match_phrase: { action_id: actionId } }],
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
                { match_phrase: { action_id: actionId } },
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

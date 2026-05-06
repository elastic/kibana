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
  actionId?: string;
  agentIds?: string[];
  interval?: number;
  skip?: boolean;
  startDate?: string;
  endDate?: string;
  scheduleId?: string;
}

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
            term: { schedule_id: scheduleId },
          },
        });

        scheduleSearchSource.setField('index', logsDataView);
        scheduleSearchSource.setField('aggs', {
          per_execution: {
            terms: {
              field: 'osquery_meta.schedule_execution_count',
              size: 1,
              order: { max_ingested: 'desc' },
            },
            aggs: {
              max_ingested: { max: { field: 'event.ingested' } },
              unique_agents: { cardinality: { field: 'agent.id' } },
            },
          },
        });

        const scheduleResponse = await lastValueFrom(scheduleSearchSource.fetch$());
        // @ts-expect-error update types
        const buckets = scheduleResponse?.rawResponse?.aggregations?.per_execution?.buckets;

        if (!buckets?.length) {
          return null;
        }

        const bucket = buckets[0];

        return {
          lastResultTime: [bucket.max_ingested?.value_as_string],
          uniqueAgentsCount: bucket.unique_agents?.value,
          docCount: bucket.doc_count,
        };
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

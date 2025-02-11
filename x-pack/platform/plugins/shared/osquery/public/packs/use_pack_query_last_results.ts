/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
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
}

export const usePackQueryLastResults = ({
  actionId,
  interval,
  startDate,
  endDate,
  skip = false,
}: UsePackQueryLastResultsProps) => {
  const data = useKibana().services.data;
  const { data: logsDataView } = useLogsDataView({ skip });

  return useQuery(
    ['scheduledQueryLastResults', { actionId }],
    async () => {
      const lastResultsSearchSource = await data.search.searchSource.create({
        size: 1,
        sort: [{ '@timestamp': SortDirection.desc }],
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
      const timestamp = lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['@timestamp'][0];

      if (timestamp) {
        const aggsSearchSource = await data.search.searchSource.create({
          size: 1,
          query: {
            // @ts-expect-error update types
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: startDate
                        ? moment(startDate).format()
                        : moment(timestamp).subtract(interval, 'seconds').format(),
                      lte: moment(endDate || timestamp).format(),
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
          '@timestamp': lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['@timestamp'],
          // @ts-expect-error update types
          uniqueAgentsCount: aggsResponse?.rawResponse.aggregations?.unique_agents?.value,
          docCount: aggsResponse?.rawResponse?.hits?.total,
        };
      }

      return null;
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && actionId && logsDataView),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

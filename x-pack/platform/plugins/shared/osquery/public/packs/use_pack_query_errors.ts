/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-plugin/common';
import { SortDirection } from '@kbn/data-plugin/common';

import { useKibana } from '../common/lib/kibana';
import { useLogsDataView } from '../common/hooks/use_logs_data_view';

interface UsePackQueryErrorsProps {
  actionId?: string;
  scheduleId?: string;
  interval: number;
  logsDataView?: DataView;
  skip?: boolean;
}

export const usePackQueryErrors = ({
  actionId,
  scheduleId,
  interval,
  skip = false,
}: UsePackQueryErrorsProps) => {
  const data = useKibana().services.data;
  const { data: logsDataView } = useLogsDataView({ skip });

  // Scheduled-pack errors logged by elastic-agent reference the schedule_id
  // (native osqueryd path) rather than the legacy action_id. Match on whichever
  // identifier the caller provided; scheduleId wins when both are present.
  const messageMatch = scheduleId ?? actionId;

  return useQuery(
    ['scheduledQueryErrors', { actionId, scheduleId, interval }],
    async () => {
      const searchSource = await data.search.searchSource.create({
        fields: ['*'],
        sort: [
          {
            '@timestamp': SortDirection.desc,
          },
        ],
        query: {
          // @ts-expect-error update types
          bool: {
            filter: [
              {
                match_phrase: {
                  message: 'Error',
                },
              },
              {
                match_phrase: {
                  'data_stream.dataset': 'elastic_agent.osquerybeat',
                },
              },
              {
                match_phrase: {
                  message: messageMatch,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: `now-${interval * 2}s`,
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
        size: 1000,
      });

      searchSource.setField('index', logsDataView);

      return lastValueFrom(searchSource.fetch$());
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && messageMatch && interval && logsDataView),
      select: (response) => response.rawResponse.hits ?? [],
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

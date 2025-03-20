/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import moment from 'moment';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export const useFetchSignificantEvents = ({
  name,
  range,
}: {
  name?: string;
  range: { from: string; to: string };
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        data,
      },
    },
  } = useKibana();

  const result = useStreamsAppFetch(
    async ({ signal }) => {
      if (!name) {
        return Promise.resolve(undefined);
      }

      const nowm = moment();

      const { min = nowm.clone().subtract(1, 'days'), max = nowm } =
        data.query.timefilter.timefilter.calculateBounds(range);

      const bucketSize =
        calculateAuto.near(50, moment.duration(max.diff(min))) ?? moment.duration(6, 'hour');

      const response = await streamsRepositoryClient.fetch(
        'GET /api/streams/{name}/significant_events 2023-10-31',
        {
          params: {
            path: { name },
            query: {
              from: min.toISOString(),
              to: max.toISOString(),
              bucketSize: `${bucketSize.asMinutes()}m`,
            },
          },
          signal,
        }
      );

      return response;
    },
    [name, range, streamsRepositoryClient]
  );

  return {
    data: result.value,
    isLoading: result.loading,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import type { AbsoluteTimeRange } from '@kbn/es-query';
import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { System, SignificantEventsPreviewResponse } from '@kbn/streams-schema';
import moment from 'moment';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

export function useSignificantEventPreviewFetch({
  name,
  feature,
  kqlQuery,
  timeRange,
  isQueryValid,
  noOfBuckets = 10,
}: {
  noOfBuckets?: number;
  name: string;
  kqlQuery: string;
  feature?: Omit<System, 'description'>;
  timeRange: AbsoluteTimeRange;
  isQueryValid: boolean;
}): AbortableAsyncState<Promise<SignificantEventsPreviewResponse>> {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const previewFetch = useStreamsAppFetch(
    ({ signal }) => {
      if (!isQueryValid) {
        return Promise.resolve(undefined);
      }

      const bucketSize = calculateAuto
        .near(noOfBuckets, moment.duration(moment(timeRange.to).diff(timeRange.from)))
        ?.asSeconds()!;

      return streams.streamsRepositoryClient.fetch(
        `POST /api/streams/{name}/significant_events/_preview 2023-10-31`,
        {
          signal,
          params: {
            path: {
              name,
            },
            query: {
              bucketSize: `${bucketSize}s`,
              from: timeRange.from,
              to: timeRange.to,
            },
            body: {
              query: {
                kql: { query: kqlQuery },
                feature,
              },
            },
          },
        }
      );
    },
    [
      isQueryValid,
      timeRange.from,
      timeRange.to,
      noOfBuckets,
      feature,
      streams.streamsRepositoryClient,
      name,
      kqlQuery,
    ]
  );

  return previewFetch;
}

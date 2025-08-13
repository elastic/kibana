/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { SignificantEventsPreviewResponse } from '@kbn/streams-schema';
import moment from 'moment';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

export function useSignificantEventPreviewFetch({
  name,
  kqlQuery,
  timeRange,
  isQueryValid,
}: {
  name: string;
  kqlQuery: string;
  timeRange: TimeRange;
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

      const { from, to } = getAbsoluteTimeRange(timeRange);

      const bucketSize = calculateAuto
        .near(50, moment.duration(moment(to).diff(from)))
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
              from,
              to,
            },
            body: {
              query: {
                kql: { query: kqlQuery },
              },
            },
          },
        }
      );
    },
    [timeRange, name, kqlQuery, streams.streamsRepositoryClient, isQueryValid]
  );

  return previewFetch;
}

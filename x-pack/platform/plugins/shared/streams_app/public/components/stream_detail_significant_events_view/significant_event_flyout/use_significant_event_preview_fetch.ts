/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsPreviewResponse, StreamQueryKql } from '@kbn/streams-schema';
import type { TimeRange } from '@kbn/es-query';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { calculateAuto } from '@kbn/calculate-auto';
import moment from 'moment';
import type { AbortableAsyncState } from '@kbn/react-hooks';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';

export function useSignificantEventPreviewFetch({
  name,
  queryValues,
  timeRange,
}: {
  name: string;
  queryValues: Partial<StreamQueryKql>;
  timeRange: TimeRange;
}): AbortableAsyncState<Promise<SignificantEventsPreviewResponse>> {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const previewFetch = useStreamsAppFetch(
    ({ signal }) => {
      const { kql } = queryValues;

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
                kql: kql ?? { query: '' },
              },
            },
          },
        }
      );
    },
    [timeRange, name, queryValues, streams.streamsRepositoryClient]
  );

  return previewFetch;
}

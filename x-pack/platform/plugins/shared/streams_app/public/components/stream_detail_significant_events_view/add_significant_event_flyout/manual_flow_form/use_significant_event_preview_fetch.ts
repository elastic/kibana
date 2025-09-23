/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { TimeState } from '@kbn/es-query';
import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { SignificantEventsPreviewResponse } from '@kbn/streams-schema';
import moment from 'moment';
import type { Condition } from '@kbn/streamlang';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

export function useSignificantEventPreviewFetch({
  name,
  system,
  kqlQuery,
  timeState,
  isQueryValid,
}: {
  name: string;
  system?: {
    name: string;
    filter: Condition;
  };
  kqlQuery: string;
  timeState: TimeState;
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

      const { from, to } = getAbsoluteTimeRange(timeState.timeRange);

      const bucketSize = calculateAuto
        .near(10, moment.duration(moment(to).diff(from)))
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
                system: system
                  ? {
                      name: system.name,
                      filter: system.filter,
                    }
                  : undefined,
                kql: { query: kqlQuery },
              },
            },
          },
        }
      );
    },
    [isQueryValid, timeState.timeRange, streams.streamsRepositoryClient, name, system, kqlQuery]
  );

  return previewFetch;
}

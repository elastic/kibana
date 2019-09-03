/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { LogSummary as LogSummaryQuery } from '../../../graphql/types';
import { useApolloClient } from '../../../utils/apollo_context';
import { useCancellableEffect } from '../../../utils/cancellable_effect';
import { logSummaryQuery } from './log_summary.gql_query';
import { useLogSummaryBufferInterval } from './use_log_summary_buffer_interval';

export type LogSummaryBetween = LogSummaryQuery.Query['source']['logSummaryBetween'];
export type LogSummaryBuckets = LogSummaryBetween['buckets'];

export const useLogSummary = (
  sourceId: string,
  midpointTime: number | null,
  intervalSize: number,
  filterQuery: string | null
) => {
  const [logSummaryBetween, setLogSummaryBetween] = useState<LogSummaryBetween>({ buckets: [] });
  const apolloClient = useApolloClient();

  const { start: bufferStart, end: bufferEnd, bucketSize } = useLogSummaryBufferInterval(
    midpointTime,
    intervalSize
  );

  useCancellableEffect(
    getIsCancelled => {
      if (!apolloClient || bufferStart === null || bufferEnd === null) {
        return;
      }

      apolloClient
        .query<LogSummaryQuery.Query, LogSummaryQuery.Variables>({
          fetchPolicy: 'no-cache',
          query: logSummaryQuery,
          variables: {
            filterQuery,
            sourceId,
            start: bufferStart,
            end: bufferEnd,
            bucketSize,
          },
        })
        .then(response => {
          if (!getIsCancelled()) {
            setLogSummaryBetween(response.data.source.logSummaryBetween);
          }
        });
    },
    [apolloClient, sourceId, filterQuery, bufferStart, bufferEnd, bucketSize]
  );

  return {
    buckets: logSummaryBetween.buckets,
    start: bufferStart,
    end: bufferEnd,
  };
};

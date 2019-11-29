/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { LogSummary as LogSummaryQuery } from '../../../graphql/types';
import { useCancellableEffect } from '../../../utils/cancellable_effect';
import { useLogSummaryBufferInterval } from './use_log_summary_buffer_interval';
import { fetchLogSummary } from './api/log_summary';
import { LogsSummaryResponse } from '../../../../common/http_api';

export type LogSummaryBetween = LogSummaryQuery.Query['source']['logSummaryBetween'];
export type LogSummaryBuckets = LogsSummaryResponse['buckets'];

export const useLogSummary = (
  sourceId: string,
  midpointTime: number | null,
  intervalSize: number,
  filterQuery: string | null
) => {
  const [logSummaryBetween, setLogSummaryBetween] = useState<LogSummaryBetween>({ buckets: [] });
  const { start: bufferStart, end: bufferEnd, bucketSize } = useLogSummaryBufferInterval(
    midpointTime,
    intervalSize
  );

  useCancellableEffect(
    getIsCancelled => {
      if (bufferStart === null || bufferEnd === null) {
        return;
      }

      fetchLogSummary({
        startDate: bufferStart,
        endDate: bufferEnd,
        bucketSize,
        query: filterQuery,
      }).then(response => {
        if (!getIsCancelled()) {
          setLogSummaryBetween(response);
        }
      });
    },
    [sourceId, filterQuery, bufferStart, bufferEnd, bucketSize]
  );

  return {
    buckets: logSummaryBetween.buckets,
    start: bufferStart,
    end: bufferEnd,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useMemo } from 'react';

import { RendererFunction } from '../../../utils/typed_react';
import { Source } from '../../source';
import { LogSummaryBuckets, useLogSummary } from './log_summary';
import { LogFilterState } from '../log_filter';
import { LogPositionState } from '../log_position';
import { datemathToEpochMillis } from '../../../utils/datemath';

export const WithSummary = ({
  children,
}: {
  children: RendererFunction<{
    buckets: LogSummaryBuckets;
    start: number | null;
    end: number | null;
  }>;
}) => {
  const { sourceId } = useContext(Source.Context);
  const { filterQuery } = useContext(LogFilterState.Context);
  const { startDate, endDate } = useContext(LogPositionState.Context);

  const startTimestamp = useMemo(() => datemathToEpochMillis(startDate), [startDate]);
  const endTimestamp = useMemo(() => datemathToEpochMillis(endDate), [endDate]);

  const { buckets, start, end } = useLogSummary(
    sourceId,
    startTimestamp,
    endTimestamp,
    filterQuery
  );

  return children({ buckets, start, end });
};

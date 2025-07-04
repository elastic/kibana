/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { isEqual } from 'lodash';
import { TimeRange } from '@kbn/es-query';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import {
  UncontrolledStreamsAppSearchBar,
  UncontrolledStreamsAppSearchBarProps,
} from './uncontrolled_streams_app_bar';
import { useTimefilter } from '../../hooks/use_timefilter';

export type StreamsAppSearchBarProps = UncontrolledStreamsAppSearchBarProps;

// If the absolute time stays the same
function needsRefresh(left: TimeRange, right: TimeRange) {
  const forceNow = new Date();
  const leftAbsolute = getAbsoluteTimeRange(left, { forceNow });
  const rightAbsolute = getAbsoluteTimeRange(right, { forceNow });

  return isEqual(leftAbsolute, rightAbsolute);
}

export function StreamsAppSearchBar({ onQuerySubmit, ...props }: StreamsAppSearchBarProps) {
  const { timeState, setTime, refresh } = useTimefilter();

  function refreshOrSetTime(next: TimeRange) {
    if (needsRefresh(timeState.timeRange, next)) {
      refresh();
    } else {
      setTime(next);
    }
  }

  return (
    <UncontrolledStreamsAppSearchBar
      onQuerySubmit={({ dateRange, query }, isUpdate) => {
        if (dateRange) {
          refreshOrSetTime(dateRange);
        }
        onQuerySubmit?.({ dateRange, query }, isUpdate);
      }}
      dateRangeFrom={timeState.timeRange.from}
      dateRangeTo={timeState.timeRange.to}
      {...props}
    />
  );
}

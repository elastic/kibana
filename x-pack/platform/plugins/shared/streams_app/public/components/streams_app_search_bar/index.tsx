/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/common';
import React from 'react';
import { isEqual } from 'lodash';
import { TimeRange } from '@kbn/es-query';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { useTimefilter } from '../../hooks/use_timefilter';
import { UncontrolledStreamsAppSearchBar } from './uncontrolled_streams_app_bar';

export interface StreamsAppSearchBarProps {
  query?: string;
  onQueryChange?: (payload: { query: string }) => void;
  onQuerySubmit?: (payload: { query: string }) => void;
  placeholder?: string;
  dataViews?: DataView[];
  showQueryInput?: boolean;
  showSubmitButton?: boolean;
  showDatePicker?: boolean;
}

// if the absolute time stays the same
function needsRefresh(left: TimeRange, right: TimeRange) {
  const forceNow = new Date();
  const leftAbsolute = getAbsoluteTimeRange(left, { forceNow });
  const rightAbsolute = getAbsoluteTimeRange(right, { forceNow });

  return isEqual(leftAbsolute, rightAbsolute);
}

export function StreamsAppSearchBar({
  onQueryChange,
  onQuerySubmit,
  query,
  placeholder,
  dataViews,
  showDatePicker = false,
  showSubmitButton = true,
  showQueryInput,
}: StreamsAppSearchBarProps) {
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
      onQuerySubmit={({ dateRange, query: nextQuery }, isUpdate) => {
        if (dateRange) {
          refreshOrSetTime(dateRange);
        }
        onQuerySubmit?.({ query: nextQuery });
      }}
      onQueryChange={({ query: nextQuery }) => {
        onQueryChange?.({ query: nextQuery });
      }}
      query={query}
      showQueryInput={showQueryInput}
      showSubmitButton={showSubmitButton}
      dateRangeFrom={showDatePicker ? timeState.timeRange.from : undefined}
      dateRangeTo={showDatePicker ? timeState.timeRange.to : undefined}
      placeholder={placeholder}
      dataViews={dataViews}
    />
  );
}

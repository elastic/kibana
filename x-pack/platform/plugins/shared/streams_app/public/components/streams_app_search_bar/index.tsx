/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/common';
import React from 'react';
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

export function StreamsAppSearchBar({
  onQueryChange,
  onQuerySubmit,
  query,
  placeholder,
  dataViews,
  showQueryInput = false,
  showDatePicker = false,
  showSubmitButton = true,
}: StreamsAppSearchBarProps) {
  const { timeState, setTime } = useTimefilter();

  return (
    <UncontrolledStreamsAppSearchBar
      onQuerySubmit={({ dateRange, query: nextQuery }) => {
        if (dateRange) {
          setTime(dateRange);
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

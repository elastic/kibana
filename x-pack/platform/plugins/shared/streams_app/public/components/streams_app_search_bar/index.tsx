/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { UncontrolledStreamsAppSearchBarProps } from './uncontrolled_streams_app_bar';
import { UncontrolledStreamsAppSearchBar } from './uncontrolled_streams_app_bar';
import { useTimeRangeSync } from '../../hooks/use_time_range_sync';

export type StreamsAppSearchBarProps = UncontrolledStreamsAppSearchBarProps;

export function StreamsAppSearchBar({ onQuerySubmit, ...props }: StreamsAppSearchBarProps) {
  const { rangeFrom, rangeTo, handleTimeChange } = useTimeRangeSync();

  return (
    <UncontrolledStreamsAppSearchBar
      onQuerySubmit={({ dateRange, query }, isUpdate) => {
        if (dateRange) {
          handleTimeChange(dateRange);
        }
        onQuerySubmit?.({ dateRange, query }, isUpdate);
      }}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      {...props}
    />
  );
}

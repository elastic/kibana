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
import { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useKibana } from '../../hooks/use_kibana';

export type StreamsAppSearchBarProps = StatefulSearchBarProps;

// If the absolute time stays the same
function needsRefresh(left: TimeRange, right: TimeRange) {
  const forceNow = new Date();
  const leftAbsolute = getAbsoluteTimeRange(left, { forceNow });
  const rightAbsolute = getAbsoluteTimeRange(right, { forceNow });

  return isEqual(leftAbsolute, rightAbsolute);
}

export function StreamsAppSearchBar({
  onQuerySubmit,
  ...props
}: Omit<StreamsAppSearchBarProps, 'appName'>) {
  const {
    dependencies: {
      start: { unifiedSearch },
    },
  } = useKibana();
  const { timeState, setTime, refresh } = useTimefilter();

  function refreshOrSetTime(next: TimeRange) {
    if (needsRefresh(timeState.timeRange, next)) {
      refresh();
    } else {
      setTime(next);
    }
  }

  return (
    <unifiedSearch.ui.SearchBar
      appName="streamsApp"
      onQuerySubmit={({ dateRange, query }, isUpdate) => {
        if (dateRange) {
          refreshOrSetTime(dateRange);
        }
        onQuerySubmit?.({ dateRange, query }, isUpdate);
      }}
      dateRangeFrom={timeState.timeRange.from}
      dateRangeTo={timeState.timeRange.to}
      showDatePicker={false}
      showFilterBar={false}
      showQueryMenu={false}
      showQueryInput={false}
      submitButtonStyle="iconOnly"
      displayStyle="inPage"
      disableQueryLanguageSwitcher
      {...props}
    />
  );
}

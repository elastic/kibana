/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query, TimeRange } from '@kbn/es-query';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { useCallback, useMemo } from 'react';

const EMPTY_KUERY_QUERY: Query = { query: '', language: 'kuery' };

/**
 * Props for `unifiedSearch.ui.SearchBar` when only the time range control is needed,
 * aligned with dashboard canvas preview (`enableDateRangePicker`, etc.).
 */
export const useVisualizationLensTimeSearchBarProps = ({
  dateRangeFrom,
  dateRangeTo,
  onDateRangeCommit,
}: {
  dateRangeFrom: string;
  dateRangeTo: string;
  onDateRangeCommit: (next: TimeRange) => void;
}): StatefulSearchBarProps<Query> => {
  const onQuerySubmit = useCallback<NonNullable<StatefulSearchBarProps<Query>['onQuerySubmit']>>(
    ({ dateRange }) => {
      onDateRangeCommit(dateRange);
    },
    [onDateRangeCommit]
  );

  return useMemo(
    (): StatefulSearchBarProps<Query> => ({
      appName: 'agentBuilder',
      useDefaultBehaviors: false,
      disableSubscribingToGlobalDataServices: true,
      enableDateRangePicker: true,
      showQueryInput: false,
      showFilterBar: false,
      showQueryMenu: false,
      showDatePicker: true,
      showSubmitButton: false,
      disableQueryLanguageSwitcher: true,
      isAutoRefreshDisabled: true,
      displayStyle: 'inPage',
      query: EMPTY_KUERY_QUERY,
      filters: [],
      indexPatterns: [],
      dateRangeFrom,
      dateRangeTo,
      onQuerySubmit,
      dataTestSubj: 'agentBuilderVisualizeLensTimeRangePicker',
    }),
    [dateRangeFrom, dateRangeTo, onQuerySubmit]
  );
};

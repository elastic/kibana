/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query, TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-24h', to: 'now' };
const EMPTY_KUERY_QUERY: Query = { query: '', language: 'kuery' };

const getInitialTimeRange = (timeRange?: TimeRange): TimeRange => ({
  from: timeRange?.from ?? DEFAULT_TIME_RANGE.from,
  to: timeRange?.to ?? DEFAULT_TIME_RANGE.to,
});

const areTimeRangesEqual = (current: TimeRange | undefined, next: TimeRange) =>
  current?.from === next.from && current?.to === next.to;

export interface UseVisPreviewUnifiedSearchResult {
  searchBarProps: StatefulSearchBarProps<Query>;
  effectiveTimeRange: TimeRange;
  onBrushEnd: NonNullable<TypedLensByValueInput['onBrushEnd']>;
}

/**
 * Local time-range state for inline Lens + unified SearchBar preview, driven by
 * `lensInput.timeRange` and `StatefulSearchBarProps` `dateRangeFrom` / `dateRangeTo`.
 */
export const useVisPreviewUnifiedSearch = ({
  lensTimeRange,
}: {
  lensTimeRange: TimeRange | undefined;
}): UseVisPreviewUnifiedSearchResult => {
  const boundsFromLens = useMemo(() => getInitialTimeRange(lensTimeRange), [lensTimeRange]);

  const [committedTimeRange, setCommittedTimeRange] = useState<TimeRange>(() => boundsFromLens);

  useEffect(() => {
    setCommittedTimeRange((current) =>
      areTimeRangesEqual(current, boundsFromLens) ? current : boundsFromLens
    );
  }, [boundsFromLens]);

  const onQuerySubmit = useCallback<NonNullable<StatefulSearchBarProps<Query>['onQuerySubmit']>>(
    ({ dateRange }) => {
      setCommittedTimeRange((current) =>
        areTimeRangesEqual(current, dateRange) ? current : dateRange
      );
    },
    []
  );

  const onBrushEnd = useCallback<NonNullable<TypedLensByValueInput['onBrushEnd']>>(({ range }) => {
    setCommittedTimeRange({
      from: new Date(range[0]).toISOString(),
      to: new Date(range[1]).toISOString(),
    });
  }, []);

  const searchBarProps = useMemo(
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
      dateRangeFrom: committedTimeRange.from,
      dateRangeTo: committedTimeRange.to,
      onQuerySubmit,
      dataTestSubj: 'agentBuilderVisualizeLensTimeRangePicker',
    }),
    [committedTimeRange.from, committedTimeRange.to, onQuerySubmit]
  );

  return useMemo(
    () => ({
      searchBarProps,
      effectiveTimeRange: committedTimeRange,
      onBrushEnd,
    }),
    [committedTimeRange, onBrushEnd, searchBarProps]
  );
};

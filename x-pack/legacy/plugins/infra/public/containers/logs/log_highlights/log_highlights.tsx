/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import React, { useContext, useEffect, useState } from 'react';
import { withLogPosition } from '../../../containers/logs/with_log_position';
import { withLogFilter } from '../../../containers/logs/with_log_filter';
import { TimeKey } from '../../../../common/time';

export const useLogHighlightsState = ({ sourceId }: { sourceId: string }) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const [startKey, setStartKey] = useState<TimeKey | null>(null);
  const [endKey, setEndKey] = useState<TimeKey | null>(null);
  const [filterQuery, setFilterQuery] = useState(null);

  useEffect(
    () => {
      // Terms, startKey, endKey or filter has changed, fetch data
    },
    [highlightTerms, startKey, endKey, filterQuery]
  );

  return {
    highlightTerms,
    setHighlightTerms,
    setStartKey,
    setEndKey,
    setFilterQuery,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);

// Bridges Redux container state with Hooks state. Once state is moved fully from
// Redux to Hooks this can be removed.
export const LogHighlightsPositionBridge = withLogPosition(
  ({
    firstVisiblePosition,
    lastVisiblePosition,
  }: {
    firstVisiblePosition: TimeKey | null;
    lastVisiblePosition: TimeKey | null;
  }) => {
    const { setStartKey, setEndKey } = useContext(LogHighlightsState.Context);
    useEffect(
      () => {
        setStartKey(firstVisiblePosition);
        setEndKey(lastVisiblePosition);
      },
      [firstVisiblePosition, lastVisiblePosition]
    );

    return null;
  }
);

export const LogHighlightsFilterQueryBridge = withLogFilter(
  ({ filterQuery }: { filterQuery: any }) => {
    const { setFilterQuery } = useContext(LogHighlightsState.Context);
    useEffect(
      () => {
        setFilterQuery(filterQuery);
      },
      [filterQuery]
    );

    return null;
  }
);

export const LogHighlightsBridge = ({ indexPattern }: { indexPattern: any }) => (
  <>
    <LogHighlightsPositionBridge />
    <LogHighlightsFilterQueryBridge indexPattern={indexPattern} />
  </>
);

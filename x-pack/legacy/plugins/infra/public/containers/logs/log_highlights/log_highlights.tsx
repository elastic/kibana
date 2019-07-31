/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useState } from 'react';

import { useHighlightsFetcher } from './data_fetching';
import { useNextAndPrevious } from './next_and_previous';
import { useReduxBridgeSetters } from './redux_bridge_setters';

export const useLogHighlightsState = ({
  sourceId,
  sourceVersion,
}: {
  sourceId: string;
  sourceVersion: string | undefined;
}) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);

  const {
    startKey,
    endKey,
    filterQuery,
    visibleMidpoint,
    setStartKey,
    setEndKey,
    setFilterQuery,
    setVisibleMidpoint,
    jumpToTarget,
    setJumpToTarget,
  } = useReduxBridgeSetters();

  const {
    logEntryHighlights,
    logEntryHighlightsById,
    loadLogEntryHighlightsRequest,
  } = useHighlightsFetcher(sourceId, sourceVersion, startKey, endKey, filterQuery, highlightTerms);

  const {
    currentHighlightKey,
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
  } = useNextAndPrevious({
    visibleMidpoint,
    logEntryHighlights,
    highlightTerms,
    jumpToTarget,
  });

  return {
    highlightTerms,
    setHighlightTerms,
    setStartKey,
    setEndKey,
    setFilterQuery,
    logEntryHighlights,
    logEntryHighlightsById,
    loadLogEntryHighlightsRequest,
    setVisibleMidpoint,
    currentHighlightKey,
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
    setJumpToTarget,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);

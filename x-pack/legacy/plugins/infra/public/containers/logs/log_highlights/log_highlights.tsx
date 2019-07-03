/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useState } from 'react';
import { useNextAndPrevious } from './next_and_previous';
import { useHighlightsFetcher } from './data_fetching';
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
  } = useReduxBridgeSetters();

  const {
    logEntryHighlights,
    logEntryHighlightsById,
    loadLogEntryHighlightsRequest,
  } = useHighlightsFetcher(sourceId, sourceVersion, startKey, endKey, filterQuery, highlightTerms);

  const {
    previousHighlightLogEntryIndex,
    nextHighlightLogEntryIndex,
    goToPreviousHighlight,
    goToNextHighlight,
    targetHighlightPosition,
  } = useNextAndPrevious(visibleMidpoint, logEntryHighlights);

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
    previousHighlightLogEntryIndex,
    nextHighlightLogEntryIndex,
    goToPreviousHighlight,
    goToNextHighlight,
    targetHighlightPosition,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);

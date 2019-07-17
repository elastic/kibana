/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useState, useContext } from 'react';

import { useHighlightsFetcher } from './data_fetching';
import { useNextAndPrevious } from './next_and_previous';
import { useReduxBridgeSetters } from './redux_bridge_setters';
import { useSummaryHighlights } from './summary_highlights';
import { useLogSummaryBufferInterval } from '../log_summary';
import { LogViewConfiguration } from '../log_view_configuration';

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

  const { intervalSize: summaryIntervalSize } = useContext(LogViewConfiguration.Context);
  const {
    start: summaryStart,
    end: summaryEnd,
    bucketSize: summaryBucketSize,
  } = useLogSummaryBufferInterval(
    visibleMidpoint ? visibleMidpoint.time : null,
    summaryIntervalSize
  );

  const {
    logEntryHighlights,
    logEntryHighlightsById,
    loadLogEntryHighlightsRequest,
  } = useHighlightsFetcher(sourceId, sourceVersion, startKey, endKey, filterQuery, highlightTerms);

  const { summaryHighlights, loadSummaryHighlightsRequest } = useSummaryHighlights(
    sourceId,
    sourceVersion,
    summaryStart,
    summaryEnd,
    summaryBucketSize,
    filterQuery,
    highlightTerms
  );

  const {
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
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
    setJumpToTarget,
    summaryHighlights,
    loadSummaryHighlightsRequest,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);

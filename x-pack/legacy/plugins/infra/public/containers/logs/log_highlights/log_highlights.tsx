/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useState, useContext } from 'react';
import { useLogEntryHighlights } from './log_entry_highlights';
import { useLogSummaryHighlights } from './log_summary_highlights';
import { useNextAndPrevious } from './next_and_previous';
import { useLogSummaryBufferInterval } from '../log_summary';
import { LogViewConfiguration } from '../log_view_configuration';
import { LogPositionState } from '../log_position';
import { TimeKey } from '../../../../common/time';

export const useLogHighlightsState = ({
  sourceId,
  sourceVersion,
  entriesStart,
  entriesEnd,
  filterQuery,
}: {
  sourceId: string;
  sourceVersion: string | undefined;
  entriesStart: TimeKey | null;
  entriesEnd: TimeKey | null;
  filterQuery: string | null;
}) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const { visibleMidpoint, jumpToTargetPosition } = useContext(LogPositionState.Context);
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
  } = useLogEntryHighlights(
    sourceId,
    sourceVersion,
    entriesStart,
    entriesEnd,
    filterQuery,
    highlightTerms
  );

  const { logSummaryHighlights, loadLogSummaryHighlightsRequest } = useLogSummaryHighlights(
    sourceId,
    sourceVersion,
    summaryStart,
    summaryEnd,
    summaryBucketSize,
    filterQuery,
    highlightTerms
  );

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
    jumpToTargetPosition,
  });

  return {
    highlightTerms,
    setHighlightTerms,
    logEntryHighlights,
    logEntryHighlightsById,
    logSummaryHighlights,
    loadLogEntryHighlightsRequest,
    loadLogSummaryHighlightsRequest,
    currentHighlightKey,
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useState } from 'react';
import useThrottle from 'react-use/lib/useThrottle';
import { TimeKey } from '@kbn/io-ts-utils';
import { LogViewReference } from '../../../../common';
import { useLogEntryHighlights } from './log_entry_highlights';
import { useLogSummaryHighlights } from './log_summary_highlights';
import { useNextAndPrevious } from './next_and_previous';
import { useLogPositionStateContext } from '../log_position';

const FETCH_THROTTLE_INTERVAL = 3000;

interface UseLogHighlightsStateProps {
  logViewReference: LogViewReference;
  sourceVersion: string | undefined;
  centerCursor: TimeKey | null;
  size: number;
  filterQuery: string | null;
}

const useLogHighlightsState = ({
  logViewReference,
  sourceVersion,
  centerCursor,
  size,
  filterQuery,
}: UseLogHighlightsStateProps) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const { visibleMidpoint, jumpToTargetPosition, startTimestamp, endTimestamp } =
    useLogPositionStateContext();

  const throttledStartTimestamp = useThrottle(startTimestamp, FETCH_THROTTLE_INTERVAL);
  const throttledEndTimestamp = useThrottle(endTimestamp, FETCH_THROTTLE_INTERVAL);

  const { logEntryHighlights, logEntryHighlightsById, loadLogEntryHighlightsRequest } =
    useLogEntryHighlights(
      logViewReference,
      sourceVersion,
      throttledStartTimestamp,
      throttledEndTimestamp,
      centerCursor,
      size,
      filterQuery,
      highlightTerms
    );

  const { logSummaryHighlights, loadLogSummaryHighlightsRequest } = useLogSummaryHighlights(
    logViewReference,
    sourceVersion,
    throttledStartTimestamp,
    throttledEndTimestamp,
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

export const [LogHighlightsStateProvider, useLogHighlightsStateContext] =
  createContainer(useLogHighlightsState);

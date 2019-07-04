/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { isNumber } from 'lodash';
import { TimeKey } from '../../../../common/time';
import { getLogEntryIndexBeforeTime, getLogEntryIndexAtTime } from '../../../utils/log_entry';

export const useNextAndPrevious = (visibleMidpoint, logEntryHighlights, highlightTerms) => {
  const [shouldJumpToHighlight, setShouldJumpToHighlight] = useState<boolean>(false);
  const [currentTimeKey, setCurrentTimeKey] = useState<TimeKey | null>(null);

  useEffect(
    () => {
      setShouldJumpToHighlight(true);
    },
    [highlightTerms]
  );

  useEffect(
    () => {
      if (shouldJumpToHighlight && logEntryHighlights) {
        setShouldJumpToHighlight(false);
        if (logEntryHighlights.length) {
          const entryTimeKey = logEntryHighlights[0].entries[0].key;
          setCurrentTimeKey(entryTimeKey);
        }
      }
    },
    [shouldJumpToHighlight, setShouldJumpToHighlight, logEntryHighlights, setCurrentTimeKey]
  );

  const indexOfCurrentTimeKey = useMemo(
    () => {
      if (currentTimeKey && logEntryHighlights && logEntryHighlights.length) {
        return getLogEntryIndexAtTime(logEntryHighlights[0].entries, currentTimeKey);
      } else {
        return null;
      }
    },
    [currentTimeKey, logEntryHighlights]
  );

  const hasPreviousHighlight = useMemo(
    () => {
      return isNumber(indexOfCurrentTimeKey) && indexOfCurrentTimeKey !== 0;
    },
    [indexOfCurrentTimeKey]
  );

  const hasNextHighlight = useMemo(
    () => {
      return (
        isNumber(indexOfCurrentTimeKey) &&
        indexOfCurrentTimeKey !== logEntryHighlights[0].entries.length - 1
      );
    },
    [indexOfCurrentTimeKey, logEntryHighlights]
  );

  const goToPreviousHighlight = useCallback(
    () => {
      if (isNumber(indexOfCurrentTimeKey)) {
        const previousIndex = indexOfCurrentTimeKey - 1;
        const entryTimeKey = logEntryHighlights[0].entries[previousIndex].key;
        setCurrentTimeKey(entryTimeKey);
      }
    },
    [indexOfCurrentTimeKey, logEntryHighlights]
  );

  const goToNextHighlight = useCallback(
    () => {
      if (isNumber(indexOfCurrentTimeKey)) {
        const nextIndex = indexOfCurrentTimeKey + 1;
        const entryTimeKey = logEntryHighlights[0].entries[nextIndex].key;
        setCurrentTimeKey(entryTimeKey);
      }
    },
    [indexOfCurrentTimeKey, logEntryHighlights]
  );

  return {
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
    currentTimeKey,
  };
};

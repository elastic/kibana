/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TimeKey } from '../../../../common/time';
import { getLogEntryIndexAtTime } from '../../../utils/log_entry';
import { LogEntryHighlights } from './data_fetching';

export const useNextAndPrevious = (
  visibleMidpoint: TimeKey | null,
  logEntryHighlights: LogEntryHighlights | undefined,
  highlightTerms: string[]
) => {
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
        !!logEntryHighlights &&
        logEntryHighlights.length > 0 &&
        isNumber(indexOfCurrentTimeKey) &&
        indexOfCurrentTimeKey !== logEntryHighlights[0].entries.length - 1
      );
    },
    [indexOfCurrentTimeKey, logEntryHighlights]
  );

  const goToPreviousHighlight = useCallback(
    () => {
      if (logEntryHighlights && logEntryHighlights.length > 0 && isNumber(indexOfCurrentTimeKey)) {
        const previousIndex = indexOfCurrentTimeKey - 1;
        const entryTimeKey = logEntryHighlights[0].entries[previousIndex].key;
        setCurrentTimeKey(entryTimeKey);
      }
    },
    [indexOfCurrentTimeKey, logEntryHighlights]
  );

  const goToNextHighlight = useCallback(
    () => {
      if (logEntryHighlights && logEntryHighlights.length > 0 && isNumber(indexOfCurrentTimeKey)) {
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';
import { isNumber } from 'lodash';
import { TimeKey } from '../../../../common/time';
import { getLogEntryIndexBeforeTime, getLogEntryIndexAtTime } from '../../../utils/log_entry';

export const useNextAndPrevious = (visibleMidpoint, logEntryHighlights) => {
  const [previousHighlightLogEntryIndex, setPreviousHighlightLogEntryIndex] = useState<
    number | null
  >(null);

  const [nextHighlightLogEntryIndex, setNextHighlightLogEntryIndex] = useState<number | null>(null);
  const [targetHighlightPosition, setTargetHighlightPosition] = useState<TimeKey | null>(null);

  useEffect(
    () => {
      if (visibleMidpoint && logEntryHighlights && logEntryHighlights[0]) {
        const currentHighlightIndexOfMidpoint = getLogEntryIndexAtTime(
          logEntryHighlights[0].entries,
          visibleMidpoint
        );
        let previousIndex = null;
        let nextIndex = null;
        if (isNumber(currentHighlightIndexOfMidpoint)) {
          previousIndex =
            currentHighlightIndexOfMidpoint > 0
              ? currentHighlightIndexOfMidpoint - 1
              : logEntryHighlights[0].entries.length - 1;
          nextIndex =
            currentHighlightIndexOfMidpoint < logEntryHighlights[0].entries.length - 1
              ? currentHighlightIndexOfMidpoint + 1
              : 0;
        } else {
          // Where this entry would be inserted to maintain sort order
          const insertionIndex = getLogEntryIndexBeforeTime(
            logEntryHighlights[0].entries,
            visibleMidpoint
          );
          previousIndex =
            insertionIndex - 1 > 0 ? insertionIndex - 1 : logEntryHighlights[0].entries.length - 1;
          nextIndex =
            insertionIndex < logEntryHighlights[0].entries.length - 1 ? insertionIndex : 0;
        }

        if (isNumber(previousIndex)) {
          setPreviousHighlightLogEntryIndex(previousIndex);
        } else {
          setPreviousHighlightLogEntryIndex(null);
        }

        if (isNumber(nextIndex)) {
          setNextHighlightLogEntryIndex(nextIndex);
        } else {
          setNextHighlightLogEntryIndex(null);
        }
      } else {
        setPreviousHighlightLogEntryIndex(null);
        setNextHighlightLogEntryIndex(null);
      }
    },
    [visibleMidpoint, logEntryHighlights]
  );

  /* TODO: Handle being at the extreme boundaries. I.e. the very top or very bottom of the scrollable area,
  in these scenarios the visibleMidpoint will stay the same, even though we want to move through the highlights.
  Otherwise, at the extreme boundaries, it's not possible to cycle from first to last, or last to first */
  const goToPreviousHighlight = useCallback(
    () => {
      if (isNumber(previousHighlightLogEntryIndex)) {
        const entry = logEntryHighlights[0].entries[previousHighlightLogEntryIndex];
        if (entry) {
          setTargetHighlightPosition(entry.key);
        }
      }
    },
    [previousHighlightLogEntryIndex, logEntryHighlights, setTargetHighlightPosition]
  );

  const goToNextHighlight = useCallback(
    () => {
      if (isNumber(nextHighlightLogEntryIndex)) {
        const entry = logEntryHighlights[0].entries[nextHighlightLogEntryIndex];
        if (entry) {
          setTargetHighlightPosition(entry.key);
        }
      }
    },
    [nextHighlightLogEntryIndex, logEntryHighlights, setTargetHighlightPosition]
  );

  return {
    previousHighlightLogEntryIndex,
    nextHighlightLogEntryIndex,
    goToPreviousHighlight,
    goToNextHighlight,
    targetHighlightPosition,
  };
};

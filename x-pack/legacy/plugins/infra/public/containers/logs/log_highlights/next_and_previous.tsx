/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TimeKey } from '../../../../common/time';
import { getLogEntryIndexAtTime, getLogEntryIndexBeforeTime } from '../../../utils/log_entry';
import { LogEntryHighlights } from './data_fetching';

export const useNextAndPrevious = ({
  highlightTerms,
  jumpToTarget,
  logEntryHighlights,
  visibleMidpoint,
}: {
  highlightTerms: string[];
  jumpToTarget: (target: TimeKey) => void;
  logEntryHighlights: LogEntryHighlights | undefined;
  visibleMidpoint: TimeKey | null;
}) => {
  const [currentTimeKey, setCurrentTimeKey] = useState<TimeKey | null>(null);

  const entries = useMemo(
    // simplification, because we only support one highlight phrase for now
    () =>
      logEntryHighlights && logEntryHighlights.length > 0 ? logEntryHighlights[0].entries : [],
    [logEntryHighlights]
  );

  useEffect(() => {
    setCurrentTimeKey(null);
  }, [highlightTerms]);

  useEffect(() => {
    if (currentTimeKey) {
      jumpToTarget(currentTimeKey);
    }
  }, [currentTimeKey, jumpToTarget]);

  useEffect(() => {
    if (currentTimeKey === null && entries.length > 0) {
      const initialIndex = visibleMidpoint
        ? clampValue(getLogEntryIndexBeforeTime(entries, visibleMidpoint), 0, entries.length - 1)
        : 0;
      const initialTimeKey = entries[initialIndex].key;
      setCurrentTimeKey(initialTimeKey);
    }
  }, [currentTimeKey, entries, setCurrentTimeKey]);

  const indexOfCurrentTimeKey = useMemo(() => {
    if (currentTimeKey && entries.length > 0) {
      return getLogEntryIndexAtTime(entries, currentTimeKey);
    } else {
      return null;
    }
  }, [currentTimeKey, entries]);

  const hasPreviousHighlight = useMemo(
    () => isNumber(indexOfCurrentTimeKey) && indexOfCurrentTimeKey > 0,
    [indexOfCurrentTimeKey]
  );

  const hasNextHighlight = useMemo(
    () =>
      entries.length > 0 &&
      isNumber(indexOfCurrentTimeKey) &&
      indexOfCurrentTimeKey < entries.length - 1,
    [indexOfCurrentTimeKey, entries]
  );

  const goToPreviousHighlight = useCallback(() => {
    if (entries.length && isNumber(indexOfCurrentTimeKey)) {
      const previousIndex = indexOfCurrentTimeKey - 1;
      const entryTimeKey = entries[previousIndex].key;
      setCurrentTimeKey(entryTimeKey);
    }
  }, [indexOfCurrentTimeKey, entries]);

  const goToNextHighlight = useCallback(() => {
    if (entries.length > 0 && isNumber(indexOfCurrentTimeKey)) {
      const nextIndex = indexOfCurrentTimeKey + 1;
      const entryTimeKey = entries[nextIndex].key;
      setCurrentTimeKey(entryTimeKey);
    }
  }, [indexOfCurrentTimeKey, entries]);

  return {
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
  };
};

const clampValue = (value: number, minValue: number, maxValue: number) =>
  Math.min(Math.max(value, minValue), maxValue);

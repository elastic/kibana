/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OnTimeChangeProps } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';

const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-24h', to: 'now' };

const areTimeRangesEqual = (currentTimeRange: TimeRange | undefined, nextTimeRange: TimeRange) =>
  currentTimeRange?.from === nextTimeRange.from && currentTimeRange.to === nextTimeRange.to;

export interface VisualizationTimeRangeControl {
  selectedTimeRange: TimeRange;
  onTimeChange: ({ start, end }: OnTimeChangeProps) => void;
  onBrushEnd: NonNullable<TypedLensByValueInput['onBrushEnd']>;
}

export const getInitialTimeRange = (timeRange?: TimeRange): TimeRange => ({
  from: timeRange?.from ?? DEFAULT_TIME_RANGE.from,
  to: timeRange?.to ?? DEFAULT_TIME_RANGE.to,
});

export const useTimeRange = ({
  timeRange,
}: {
  timeRange?: TimeRange;
}): VisualizationTimeRangeControl => {
  const initialTimeRange = getInitialTimeRange(timeRange);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(() => initialTimeRange);
  const { from, to } = initialTimeRange;

  const updateSelectedTimeRange = useCallback((nextTimeRange: TimeRange) => {
    setSelectedTimeRange((currentTimeRange) =>
      areTimeRangesEqual(currentTimeRange, nextTimeRange) ? currentTimeRange : nextTimeRange
    );
  }, []);

  useEffect(() => {
    updateSelectedTimeRange({ from, to });
  }, [from, to, updateSelectedTimeRange]);

  const onTimeChange = useCallback(
    ({ start, end }: OnTimeChangeProps) => {
      updateSelectedTimeRange({ from: start, to: end });
    },
    [updateSelectedTimeRange]
  );

  const onBrushEnd = useCallback<NonNullable<TypedLensByValueInput['onBrushEnd']>>(
    ({ range }) => {
      updateSelectedTimeRange({
        from: new Date(range[0]).toISOString(),
        to: new Date(range[1]).toISOString(),
      });
    },
    [updateSelectedTimeRange]
  );

  return useMemo(
    () => ({ selectedTimeRange, onTimeChange, onBrushEnd }),
    [onBrushEnd, onTimeChange, selectedTimeRange]
  );
};

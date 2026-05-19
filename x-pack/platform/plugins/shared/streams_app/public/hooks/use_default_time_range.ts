/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useTimeRangeUpdate } from './use_time_range_update';

interface UseDefaultTimeRangeProps {
  from: string;
  to: string;
}

/**
 * Hook that sets a default time range in the URL on mount.
 * Only applies once per component lifecycle. The global timefilter
 * is synced from URL params by DateRangeRedirect.
 * @param from - The from time range
 * @param to - The to time range
 */
export const useDefaultTimeRange = ({ from, to }: UseDefaultTimeRangeProps) => {
  const { updateTimeRange } = useTimeRangeUpdate();
  const hasSetInitialTime = useRef(false);

  useEffect(() => {
    if (!hasSetInitialTime.current) {
      updateTimeRange({ from, to });
      hasSetInitialTime.current = true;
    }
  }, [from, to, updateTimeRange]);
};

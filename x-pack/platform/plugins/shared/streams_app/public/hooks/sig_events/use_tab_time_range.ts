/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { TimeRange } from '@kbn/es-query';

interface UseTabTimeRangeResult {
  pickerRange: TimeRange;
  absoluteRange: TimeRange;
  handleTimeChange: ({ start, end }: { start: string; end: string }) => void;
  refreshAbsoluteRange: () => void;
}

/**
 * Manages picker/absolute time range state for discovery tabs.
 * The absolute range is intentionally frozen on each explicit time change or refresh —
 * it is decoupled from the global Kibana timefilter so tab queries are not
 * affected by automatic refreshes from unrelated parts of the UI.
 */
export const useTabTimeRange = (
  defaultRange: Pick<TimeRange, 'from' | 'to'>
): UseTabTimeRangeResult => {
  const [pickerRange, setPickerRange] = useState(defaultRange);
  const [absoluteRange, setAbsoluteRange] = useState(() =>
    getAbsoluteTimeRange(defaultRange, { forceNow: new Date() })
  );

  const handleTimeChange = ({ start: s, end: e }: { start: string; end: string }) => {
    setPickerRange({ from: s, to: e });
    setAbsoluteRange(getAbsoluteTimeRange({ from: s, to: e }, { forceNow: new Date() }));
  };

  const refreshAbsoluteRange = () => {
    setAbsoluteRange(getAbsoluteTimeRange(pickerRange, { forceNow: new Date() }));
  };

  return { pickerRange, absoluteRange, handleTimeChange, refreshAbsoluteRange };
};

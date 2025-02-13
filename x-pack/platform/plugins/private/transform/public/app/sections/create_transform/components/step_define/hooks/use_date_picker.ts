/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { merge } from 'rxjs';

import type { TimeRange } from '@kbn/es-query';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';

import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';

import type { StepDefineExposedState } from '../common';
import type { StepDefineFormProps } from '../step_define_form';

export const useDatePicker = (
  defaults: StepDefineExposedState,
  dataView: StepDefineFormProps['searchItems']['dataView']
) => {
  const hasValidTimeField = useMemo(
    () => dataView.timeFieldName !== undefined && dataView.timeFieldName !== '',
    [dataView.timeFieldName]
  );

  const timefilter = useTimefilter({
    timeRangeSelector: hasValidTimeField,
    autoRefreshSelector: false,
  });

  // The internal state of the date picker apply button.
  const [isDatePickerApplyEnabled, setDatePickerApplyEnabled] = useState(
    defaults.isDatePickerApplyEnabled
  );

  // The time range selected via the date picker
  const [timeRange, setTimeRange] = useState<TimeRange>();

  // Set up subscriptions to date picker updates
  useEffect(() => {
    const updateTimeRange = () => setTimeRange(timefilter.getTime());

    const timefilterUpdateSubscription = merge(
      timefilter.getAutoRefreshFetch$(),
      timefilter.getTimeUpdate$(),
      mlTimefilterRefresh$
    ).subscribe(updateTimeRange);

    const timefilterEnabledSubscription = timefilter
      .getEnabledUpdated$()
      .subscribe(updateTimeRange);

    return () => {
      timefilterUpdateSubscription.unsubscribe();
      timefilterEnabledSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive ms timestamps from timeRange updates.
  const timeRangeMs: TimeRangeMs | undefined = useMemo(() => {
    const timefilterActiveBounds = timefilter.getActiveBounds();
    if (
      timefilterActiveBounds !== undefined &&
      timefilterActiveBounds.min !== undefined &&
      timefilterActiveBounds.max !== undefined
    ) {
      return {
        from: timefilterActiveBounds.min.valueOf(),
        to: timefilterActiveBounds.max.valueOf(),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  return {
    actions: { setDatePickerApplyEnabled },
    state: { isDatePickerApplyEnabled, hasValidTimeField, timeRange, timeRangeMs },
  };
};

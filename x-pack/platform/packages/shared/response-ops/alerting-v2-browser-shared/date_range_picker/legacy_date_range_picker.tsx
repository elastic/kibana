/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';

interface TimeHistoryLike {
  add: (range: { from: string; to: string }) => void;
}

export interface LegacyDateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  timeHistory: TimeHistoryLike;
  onRefresh?: () => void;
  isLoading?: boolean;
  width?: 'auto' | 'restricted' | 'full';
  compressed?: boolean;
  dateFormat?: string;
  'data-test-subj'?: string;
}

export const LegacyDateRangePicker = ({
  from,
  to,
  onChange,
  timeHistory,
  onRefresh,
  isLoading = false,
  width = 'auto',
  compressed = true,
  dateFormat,
  'data-test-subj': dataTestSubj,
}: LegacyDateRangePickerProps) => {
  const handleTimeChange = useCallback(
    ({ start, end }: { start: string; end: string }) => {
      onChange({ from: start, to: end });
      timeHistory.add({ from: start, to: end });
    },
    [onChange, timeHistory]
  );

  const canManuallyRefresh = Boolean(onRefresh);

  return (
    <EuiSuperDatePicker
      start={from}
      end={to}
      onTimeChange={handleTimeChange}
      onRefresh={onRefresh}
      isLoading={isLoading}
      showUpdateButton={canManuallyRefresh ? 'iconOnly' : false}
      updateButtonProps={canManuallyRefresh ? { fill: false } : undefined}
      width={width === 'restricted' ? 'auto' : width}
      compressed={compressed}
      dateFormat={dateFormat}
      data-test-subj={dataTestSubj}
    />
  );
};

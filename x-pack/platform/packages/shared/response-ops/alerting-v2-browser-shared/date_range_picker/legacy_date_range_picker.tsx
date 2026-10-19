/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker, EuiSuperUpdateButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const REFRESH_LABEL = i18n.translate('xpack.alertingV2.dateRangePicker.refreshButtonLabel', {
  defaultMessage: 'Refresh',
});

const UPDATE_LABEL = i18n.translate('xpack.alertingV2.dateRangePicker.updateButtonLabel', {
  defaultMessage: 'Update',
});

interface TimeHistoryLike {
  add: (range: { from: string; to: string }) => void;
}

export interface LegacyDateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  timeHistory: TimeHistoryLike;
  onRefresh?: () => void;
  onManualRefresh?: () => void;
  isLoading?: boolean;
  needsUpdate?: boolean;
  isRefreshDisabled?: boolean;
  refreshTooltip?: string;
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
  onManualRefresh,
  isLoading = false,
  needsUpdate = false,
  isRefreshDisabled = false,
  refreshTooltip,
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

  const manualRefresh = onManualRefresh ?? onRefresh;
  const usesSeparateManualRefresh = Boolean(onManualRefresh);
  const canManuallyRefresh = Boolean(manualRefresh);
  const handleManualRefresh = useCallback(() => {
    manualRefresh?.();
  }, [manualRefresh]);

  const picker = (
    <EuiSuperDatePicker
      start={from}
      end={to}
      onTimeChange={handleTimeChange}
      onRefresh={onRefresh}
      isLoading={isLoading}
      showUpdateButton={canManuallyRefresh && !usesSeparateManualRefresh ? 'iconOnly' : false}
      updateButtonProps={
        canManuallyRefresh && !usesSeparateManualRefresh ? { fill: false } : undefined
      }
      width={width === 'restricted' ? 'auto' : width}
      compressed={compressed}
      dateFormat={dateFormat}
      data-test-subj={dataTestSubj}
    />
  );

  if (!usesSeparateManualRefresh) {
    return picker;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{picker}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSuperUpdateButton
          iconOnly
          fill={false}
          size="s"
          aria-label={needsUpdate ? undefined : REFRESH_LABEL}
          onClick={handleManualRefresh}
          isLoading={isLoading}
          isDisabled={isRefreshDisabled}
          needsUpdate={needsUpdate}
          showTooltip={false}
          toolTipProps={{
            content: refreshTooltip ?? (needsUpdate ? UPDATE_LABEL : REFRESH_LABEL),
            disableScreenReaderOutput: true,
          }}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-refresh` : 'alertingDateRangeRefresh'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

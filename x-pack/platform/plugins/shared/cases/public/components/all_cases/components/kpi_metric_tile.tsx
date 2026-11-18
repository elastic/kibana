/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip, EuiLoadingSpinner, EuiStat, EuiText } from '@elastic/eui';
import prettyMilliseconds from 'pretty-ms';
import type { KpiMetricFormat } from '../../../../common/constants';
import type { KpiMetricDirection, KpiMetricThreshold } from '../../../../common/types/domain';
import { KPI_METRIC_CHANGE, KPI_METRIC_ERROR_ARIA_LABEL } from '../translations';

const PRETTY_MS_OPTIONS = { compact: true, verbose: false } as const;
const SECONDS_TO_MS = 1000;
const EMPTY_VALUE = '-';

export interface KpiMetricTileProps {
  label: string;
  value: number | null | undefined;
  format: KpiMetricFormat;
  threshold?: KpiMetricThreshold;
  /**
   * The value of the period of equal length directly before the selected range
   */
  previousValue?: number | null;
  direction?: KpiMetricDirection;
  isLoading: boolean;
  /**
   * When set, the tile shows the empty state and the message in a tooltip.
   */
  errorMessage?: string;
  /**
   * When set, the tile shows an info icon next to the label with this text in a tooltip.
   */
  dateHint?: string;
  dataTestSubj: string;
}

export const formatKpiMetricValue = (
  value: number | null | undefined,
  format: KpiMetricFormat
): string => {
  if (value == null) {
    return EMPTY_VALUE;
  }

  if (format === 'duration') {
    return prettyMilliseconds(value * SECONDS_TO_MS, PRETTY_MS_OPTIONS);
  }

  if (format === 'percent') {
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatKpiChangePercent = (changePercent: number): string => {
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toLocaleString(undefined, { maximumFractionDigits: 0 })}%`;
};

/**
 * Returns the change from the previous value in percent, or undefined when no comparison is possible.
 */
export const getKpiChangePercent = (
  value: number | null | undefined,
  previousValue: number | null | undefined
): number | undefined => {
  if (value == null || previousValue == null || previousValue === 0) {
    return;
  }

  return ((value - previousValue) / Math.abs(previousValue)) * 100;
};

export const getKpiChangeColor = (
  changePercent: number,
  direction?: KpiMetricDirection
): 'success' | 'danger' | 'subdued' => {
  if (direction == null || changePercent === 0) {
    return 'subdued';
  }

  const isBetter = direction === 'higher_is_better' ? changePercent > 0 : changePercent < 0;

  return isBetter ? 'success' : 'danger';
};

export const getKpiThresholdColor = (
  value: number | null | undefined,
  threshold?: KpiMetricThreshold
): 'danger' | 'success' | undefined => {
  if (value == null || threshold == null) {
    return;
  }

  const isBreached =
    threshold.comparator === 'above' ? value > threshold.value : value < threshold.value;

  return isBreached ? 'danger' : 'success';
};

const KpiMetricTileComponent: React.FC<KpiMetricTileProps> = ({
  label,
  value,
  format,
  threshold,
  previousValue,
  direction,
  isLoading,
  errorMessage,
  dateHint,
  dataTestSubj,
}) => {
  const hasError = errorMessage != null;
  const changePercent =
    hasError || isLoading ? undefined : getKpiChangePercent(value, previousValue);

  const description =
    hasError || dateHint != null ? (
      <>
        {label}
        {dateHint != null && (
          <>
            {' '}
            <EuiIconTip
              type="info"
              color="subdued"
              content={dateHint}
              iconProps={{ 'data-test-subj': `${dataTestSubj}-date-hint` }}
            />
          </>
        )}
        {hasError && (
          <>
            {' '}
            <EuiIconTip
              type="warning"
              color="subdued"
              content={errorMessage}
              aria-label={KPI_METRIC_ERROR_ARIA_LABEL}
            />
          </>
        )}
      </>
    ) : (
      label
    );

  let title: React.ReactNode = hasError ? EMPTY_VALUE : formatKpiMetricValue(value, format);

  if (isLoading) {
    title = <EuiLoadingSpinner data-test-subj={`${dataTestSubj}-loading-spinner`} />;
  }

  return (
    <EuiStat
      data-test-subj={dataTestSubj}
      description={description}
      title={title}
      titleColor={hasError ? 'subdued' : getKpiThresholdColor(value, threshold)}
      titleSize="xs"
      text-align="left"
    >
      {changePercent != null && (
        <EuiText
          size="xs"
          color={getKpiChangeColor(changePercent, direction)}
          data-test-subj={`${dataTestSubj}-change`}
        >
          {KPI_METRIC_CHANGE(formatKpiChangePercent(changePercent))}
        </EuiText>
      )}
    </EuiStat>
  );
};
KpiMetricTileComponent.displayName = 'KpiMetricTile';

export const KpiMetricTile = React.memo(KpiMetricTileComponent);

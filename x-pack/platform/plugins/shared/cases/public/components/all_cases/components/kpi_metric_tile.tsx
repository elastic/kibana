/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip, EuiLoadingSpinner, EuiStat } from '@elastic/eui';
import prettyMilliseconds from 'pretty-ms';
import type { KpiMetricFormat } from '../../../../common/constants';
import type { KpiMetricThreshold } from '../../../../common/types/domain';
import { KPI_METRIC_ERROR_ARIA_LABEL } from '../translations';

const PRETTY_MS_OPTIONS = { compact: true, verbose: false } as const;
const SECONDS_TO_MS = 1000;
const EMPTY_VALUE = '-';

export interface KpiMetricTileProps {
  label: string;
  value: number | null | undefined;
  format: KpiMetricFormat;
  threshold?: KpiMetricThreshold;
  isLoading: boolean;
  /**
   * When set, the tile shows the empty state and the message in a tooltip.
   */
  errorMessage?: string;
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

  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
  isLoading,
  errorMessage,
  dataTestSubj,
}) => {
  const hasError = errorMessage != null;

  const description = hasError ? (
    <>
      {label}{' '}
      <EuiIconTip
        type="warning"
        color="subdued"
        content={errorMessage}
        aria-label={KPI_METRIC_ERROR_ARIA_LABEL}
      />
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
    />
  );
};
KpiMetricTileComponent.displayName = 'KpiMetricTile';

export const KpiMetricTile = React.memo(KpiMetricTileComponent);

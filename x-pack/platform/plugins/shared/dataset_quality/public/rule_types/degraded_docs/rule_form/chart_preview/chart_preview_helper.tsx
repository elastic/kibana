/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIcon, EuiLoadingChart, EuiText, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { IconChartBar } from '@kbn/chart-icons';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';

export type Maybe<T> = T | null | undefined;

function isFiniteNumber(value: any): value is number {
  return isFinite(value);
}

export function asPercent(
  numerator: Maybe<number>,
  denominator: number | undefined,
  fallbackResult = 'N/A'
) {
  if (!denominator || !isFiniteNumber(numerator)) {
    return fallbackResult;
  }

  const decimal = numerator / denominator;

  if (Math.abs(decimal) >= 0.1 || decimal === 0) {
    return numeral(decimal).format('0.000%');
  }

  return numeral(decimal).format('0.000%');
}

export const TIME_LABELS = {
  s: i18n.translate('xpack.datasetQuality.alerts.timeLabels.seconds', {
    defaultMessage: 'seconds',
  }),
  m: i18n.translate('xpack.datasetQuality.alerts.timeLabels.minutes', {
    defaultMessage: 'minutes',
  }),
  h: i18n.translate('xpack.datasetQuality.alerts.timeLabels.hours', {
    defaultMessage: 'hours',
  }),
  d: i18n.translate('xpack.datasetQuality.alerts.timeLabels.days', {
    defaultMessage: 'days',
  }),
};

export const getDomain = (series: Array<{ name?: string; data: any[] }>) => {
  const xValues = series.flatMap((item) => item.data.map((d) => d.x));
  const yValues = series.flatMap((item) => item.data.map((d) => d.y || 0));
  return {
    xMax: Math.max(...xValues),
    xMin: Math.min(...xValues),
    yMax: Math.max(...yValues),
    yMin: Math.min(...yValues),
  };
};

const EmptyContainer: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <div
    style={{
      width: '100%',
      height: 150,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {children}
  </div>
);

export function NoDataState() {
  return (
    <EmptyContainer>
      <EmptyPlaceholder
        icon={IconChartBar}
        message={
          <FormattedMessage
            id="xpack.datasetQuality.chartPreview.noDataMessage"
            defaultMessage="No results found"
          />
        }
      />
    </EmptyContainer>
  );
}

export function LoadingState() {
  return (
    <EmptyContainer>
      <EuiText color="subdued" data-test-subj="loadingData">
        <EuiLoadingChart size="m" />
      </EuiText>
    </EmptyContainer>
  );
}

export function ErrorState() {
  return (
    <EmptyContainer>
      <EuiText color="subdued" data-test-subj="chartErrorState">
        <FormattedMessage
          id="xpack.datasetQuality.alerts.charts.errorMessage"
          defaultMessage="Uh oh, something went wrong"
        />
      </EuiText>
    </EmptyContainer>
  );
}

interface PreviewChartLabel {
  field: string;
  timeSize: number;
  timeUnit: string;
  series: number;
  totalGroups: number;
}

export function TimeLabelForData({
  field,
  timeSize,
  timeUnit,
  series,
  totalGroups,
}: PreviewChartLabel) {
  const totalGroupsTooltip = i18n.translate(
    'xpack.datasetQuality.chartPreview.TimeLabelForData.totalGroupsTooltip',
    {
      defaultMessage: 'Showing {series} out of {totalGroups} groups',
      values: {
        series,
        totalGroups,
      },
    }
  );

  const xAxisInfo = (
    <EuiText size="xs">
      <strong>
        <FormattedMessage
          id="xpack.datasetQuality.chartPreview.timeLabelForData.xAxis"
          defaultMessage="{field} per {timeSize} {timeUnit}"
          values={{
            field,
            timeSize,
            timeUnit: TIME_LABELS[timeUnit as keyof typeof TIME_LABELS],
          }}
        />
      </strong>
    </EuiText>
  );

  return (
    <div style={{ textAlign: 'center' }}>
      {totalGroups > series ? (
        <EuiToolTip content={totalGroupsTooltip} position="top">
          <EuiFlexGroup gutterSize="xs">
            {xAxisInfo}
            <EuiIcon size="s" color="subdued" type="question" className="eui-alignTop" />
          </EuiFlexGroup>
        </EuiToolTip>
      ) : (
        xAxisInfo
      )}
    </div>
  );
}

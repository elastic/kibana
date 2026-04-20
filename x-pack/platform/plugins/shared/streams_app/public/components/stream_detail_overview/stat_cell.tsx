/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function StatCell({
  title,
  unit,
  value,
  subtitle,
}: {
  title: string;
  unit: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <EuiFlexItem>
      <EuiText size="s" color="subdued">
        <h4>{title}</h4>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <p>{value}</p>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText
            size="s"
            color="subdued"
            css={css`
              margin-bottom: 2px;
            `}
          >
            <p>{unit}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <div
        css={css`
          min-height: 16px;
        `}
      >
        {subtitle}
      </div>
    </EuiFlexItem>
  );
}

export function TrendSubtitle({
  trend,
  loading,
  children,
}: {
  trend?: number | null;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  if (children !== undefined) {
    return (
      <EuiText size="xs" color="subdued">
        {children}
      </EuiText>
    );
  }
  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }
  if (trend === null || trend === undefined) {
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.streams.ingestChartStatistics.trend.noTrendAvailable', {
          defaultMessage: 'no trends available yet',
        })}
      </EuiText>
    );
  }
  const isPositive = trend >= 0;
  return (
    <EuiText size="xs" color={isPositive ? 'success' : 'danger'}>
      {i18n.translate('xpack.streams.ingestChartStatistics.trend.vsLastWeek', {
        defaultMessage: '{arrow}{sign}{pct}% vs. last week',
        values: {
          arrow: isPositive ? '↑' : '↓',
          sign: isPositive ? '+' : '',
          pct: Math.abs(trend).toFixed(0),
        },
      })}
    </EuiText>
  );
}

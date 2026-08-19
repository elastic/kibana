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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';

const COLOR_MAP = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  primary: 'primary',
  text: 'text',
  subdued: 'subduedText',
} as const;

export function StatCell({
  title,
  unit,
  value,
  valueColor,
  subtitle,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  unit?: string;
  value: React.ReactNode;
  valueColor?: keyof typeof COLOR_MAP;
  subtitle?: React.ReactNode;
  'data-test-subj'?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const resolvedColor = valueColor ? euiTheme.colors[COLOR_MAP[valueColor]] : undefined;

  return (
    <EuiFlexItem data-test-subj={dataTestSubj}>
      <EuiText size="s" color="subdued">
        <h4>{title}</h4>
      </EuiText>

      <EuiSpacer size="xs" />

      <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m" css={resolvedColor ? { color: resolvedColor } : undefined}>
            <span>{value}</span>
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
  const { euiTheme } = useEuiTheme();

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
      <EuiText size="xs" css={{ color: euiTheme.colors.textDisabled }}>
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

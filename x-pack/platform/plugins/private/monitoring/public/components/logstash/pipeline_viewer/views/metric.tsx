/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexItem, EuiBadge, EuiText, UseEuiTheme } from '@elastic/eui';

type Type = 'cpuTime' | 'events' | 'eventsEmitted' | 'eventMillis';

const metricStyle = (type: Type) => (theme: UseEuiTheme) => {
  let width: string;

  switch (type) {
    case 'cpuTime':
      width = theme.euiTheme.size.xxl;
      break;
    case 'events':
    case 'eventsEmitted':
      width = `calc(${theme.euiTheme.size.xxl} * 4)`;
      break;
    case 'eventMillis':
      width = `calc(${theme.euiTheme.size.xxl} * 2)`;
      break;
    default:
      width = 'auto';
  }

  return css`
    text-align: right;
    width: ${width};

    @media (min-width: ${theme.euiTheme.breakpoint.m}) {
      text-align: left;
      padding-left: ${theme.euiTheme.size.xl};
    }
  `;
};

const metricFlexItemStyle = (theme: UseEuiTheme) => css`
  @media (min-width: ${theme.euiTheme.breakpoint.m}) {
    margin-bottom: ${theme.euiTheme.size.xs} !important;
  }
`;

interface MetricProps {
  type: Type;
  value: string;
  warning?: boolean;
}

export function Metric({ type, warning, value }: MetricProps) {
  let stylizedValue;

  if (warning) {
    stylizedValue = <EuiBadge color="warning">{value}</EuiBadge>;
  } else {
    stylizedValue = (
      <EuiText css={metricStyle(type)} size="s" color="subdued">
        <span>{value}</span>
      </EuiText>
    );
  }
  return (
    <EuiFlexItem css={metricFlexItemStyle} grow={false}>
      {stylizedValue}
    </EuiFlexItem>
  );
}

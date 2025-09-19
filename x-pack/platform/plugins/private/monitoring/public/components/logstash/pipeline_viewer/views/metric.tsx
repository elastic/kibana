/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexItem, EuiBadge, EuiText, logicalCSS } from '@elastic/eui';

type Type = 'cpuTime' | 'events' | 'eventsEmitted' | 'eventMillis';

const metricStyle =
  (type: Type) =>
  ({ euiTheme }: UseEuiTheme) => {
    let width: string;

    switch (type) {
      case 'cpuTime':
        width = euiTheme.size.xxl;
        break;
      case 'events':
      case 'eventsEmitted':
        width = `calc(${euiTheme.size.xxl} * 4)`;
        break;
      case 'eventMillis':
        width = `calc(${euiTheme.size.xxl} * 2)`;
        break;
      default:
        width = 'auto';
    }

    return css`
      text-align: right;
      width: ${width};

      @media (min-width: ${euiTheme.breakpoint.m}) {
        text-align: left;
        ${logicalCSS('padding-left', euiTheme.size.xl)}
      }
    `;
  };

const metricFlexItemStyle = ({ euiTheme }: UseEuiTheme) => css`
  @media (min-width: ${euiTheme.breakpoint.m}) {
    ${logicalCSS('margin-bottom', euiTheme.size.xs)}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { euiFontSize, UseEuiTheme } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { Series } from './types';

const tooltipLabelStyle = (theme: UseEuiTheme) => css`
  text-align: left;
  font-size: ${euiFontSize(theme, 'xs').fontSize};
  padding: ${theme.euiTheme.size.xs};
  word-wrap: break-word;
  white-space: normal;
  font-weight: ${theme.euiTheme.font.weight.bold};
`;

const tooltipValueStyle = (theme: UseEuiTheme) => css`
  text-align: left;
  font-size: ${euiFontSize(theme, 'xs').fontSize};
  padding: ${theme.euiTheme.size.xs};
  word-wrap: break-word;
  white-space: normal;
`;

interface Props {
  series: Series[];
  bucketSize?: string;
}

export function InfoTooltip({ series, bucketSize }: Props) {
  const tableRows = series.map((item, index) => {
    return (
      <tr
        key={`chart-tooltip-${index}`}
        data-debug-metric-agg={item.metric.metricAgg}
        data-debug-metric-field={item.metric.field}
        data-debug-metric-is-derivative={item.metric.isDerivative}
        data-debug-metric-has-calculation={item.metric.hasCalculation}
      >
        <td css={tooltipLabelStyle}>{item.metric.label}</td>
        <td css={tooltipValueStyle}>{item.metric.description}</td>
      </tr>
    );
  });

  return (
    <table>
      <tbody>
        <tr>
          <td css={tooltipLabelStyle}>
            <FormattedMessage
              id="xpack.monitoring.chart.infoTooltip.intervalLabel"
              defaultMessage="Interval"
            />
          </td>
          <td css={tooltipValueStyle}>{bucketSize}</td>
        </tr>
        {tableRows}
      </tbody>
    </table>
  );
}

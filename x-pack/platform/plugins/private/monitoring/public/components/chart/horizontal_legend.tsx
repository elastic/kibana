/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  UseEuiTheme,
  euiFontSize,
  logicalCSS,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { includes, isFunction } from 'lodash';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

const legendItemStyle = (isDisabled: boolean) => (theme: UseEuiTheme) =>
  css`
    display: flex;
    font-size: ${euiFontSize(theme, 'xs').fontSize};
    cursor: pointer;
    color: ${theme.euiTheme.colors.textParagraph};
    display: flex;
    flex-direction: row;
    align-items: center;
    ${isDisabled ? 'opacity: 0.5;' : ''}
  `;

const legendHorizontalStyle = ({ euiTheme }: UseEuiTheme) => css`
  ${logicalCSS('margin-top', euiTheme.size.xs)}
`;

const legendLabelStyle = css`
  overflow: hidden;
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const legendValueStyle = ({ euiTheme }: UseEuiTheme) => css`
  overflow: hidden;
  white-space: nowrap;
  ${logicalCSS('margin-left', euiTheme.size.xs)}
`;

interface Row {
  id: string;
  label: string;
  legend?: boolean;
  color?: string;
  tickFormatter?: (arg: number) => number;
}

interface Props {
  series: Row[];
  seriesValues: { [key: string]: number };
  seriesFilter: string[];
  onToggle: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
  legendFormatter?: (value: number) => number;
  tickFormatter?: (value: number) => number;
}

export class HorizontalLegend extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    this.formatter = this.formatter.bind(this);
    this.createSeries = this.createSeries.bind(this);
  }

  /**
   * @param {Number} value Final value to display
   */
  displayValue(value: number) {
    return <span css={legendValueStyle}>{value}</span>;
  }

  /**
   * @param {Number} value True if value is falsy and/or not a number
   */
  validValue(value: number) {
    return value !== null && value !== undefined && (typeof value === 'string' || !isNaN(value));
  }

  /**
   * @param {Number} value The value to format and show in the horizontallegend.
   * A null means no data for the time bucket and will be formatted as 'N/A'
   * @param {Object} row Props passed form a parent by row index
   */
  formatter(value: number, row: Row) {
    if (!this.validValue(value)) {
      return (
        <FormattedMessage
          id="xpack.monitoring.chart.horizontalLegend.notAvailableLabel"
          defaultMessage="N/A"
        />
      );
    }

    if (row?.tickFormatter) {
      return this.displayValue(row.tickFormatter(value));
    }

    const formatter = this.props.legendFormatter || this.props.tickFormatter;

    if (isFunction(formatter)) {
      return this.displayValue(formatter(value));
    }
    return this.displayValue(value);
  }

  createSeries(row: Row, rowIdx: number) {
    if (!row.label || row.legend === false) {
      return <div key={rowIdx} style={{ display: 'none' }} />;
    }

    return (
      <EuiFlexItem grow={false} key={rowIdx}>
        <button
          css={legendItemStyle(!includes(this.props.seriesFilter, row.id))}
          onClick={(event) => this.props.onToggle(event, row.id)}
        >
          <span css={legendLabelStyle}>
            <EuiIcon
              aria-label={i18n.translate(
                'xpack.monitoring.chart.horizontalLegend.toggleButtonAriaLabel',
                { defaultMessage: 'toggle button' }
              )}
              size="l"
              type="dot"
              color={row.color}
            />
            {` ${row.label} `}
          </span>
          {this.formatter(this.props.seriesValues[row.id], row)}
        </button>
      </EuiFlexItem>
    );
  }

  render() {
    const rows = this.props.series.map(this.createSeries);

    return (
      <div css={legendHorizontalStyle}>
        <EuiFlexGroup wrap={true} gutterSize="s">
          {rows}
        </EuiFlexGroup>
      </div>
    );
  }
}

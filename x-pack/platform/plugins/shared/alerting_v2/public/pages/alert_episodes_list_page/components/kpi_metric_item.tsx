/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiStat, formatNumber, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface KpiMetricItemProps {
  label: string;
  value: number;
  isSelected?: boolean;
  isInteractive?: boolean;
  emphasizeValue?: boolean;
  onClick?: () => void;
  'data-test-subj'?: string;
}

export const KpiMetricItem = ({
  label,
  value,
  isSelected = false,
  isInteractive = true,
  emphasizeValue = false,
  onClick,
  'data-test-subj': dataTestSubj,
}: KpiMetricItemProps) => {
  const { euiTheme } = useEuiTheme();
  const formattedValue = formatNumber(value, '0,0.[0]a');

  const stat = (
    <EuiStat
      data-test-subj={dataTestSubj}
      title={formattedValue}
      description={label}
      titleSize="s"
      titleColor={emphasizeValue ? 'danger' : 'default'}
      reverse
      css={css`
        width: 100%;
      `}
    />
  );

  const wrapperCss = css`
    width: 100%;
    padding: ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.medium};
    border: ${euiTheme.border.width.thin} solid
      ${isSelected ? euiTheme.colors.borderBaseProminent : 'transparent'};
    background: ${isSelected ? euiTheme.colors.backgroundBaseHighlighted : 'transparent'};
    ${isInteractive
      ? css`
          cursor: pointer;
          &:hover {
            background: ${euiTheme.colors.backgroundBaseHighlighted};
          }
        `
      : ''}
  `;

  if (!isInteractive || !onClick) {
    return (
      <EuiFlexItem grow={1}>
        <div css={wrapperCss}>{stat}</div>
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexItem grow={1}>
      <button
        type="button"
        onClick={onClick}
        css={css`
          border: none;
          background: transparent;
          padding: 0;
          text-align: left;
          width: 100%;
          ${wrapperCss}
        `}
        aria-pressed={isSelected}
      >
        {stat}
      </button>
    </EuiFlexItem>
  );
};

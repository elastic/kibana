/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  GANTT_STATUS_LEGEND_ORDER,
  ganttStatusColor,
  ganttStatusLabel,
} from './gantt_status_palette';

const SWATCH_WIDTH_PX = 20;
const SWATCH_HEIGHT_PX = 8;

interface SwatchProps {
  background: string;
}

const PillSwatch: React.FC<SwatchProps> = ({ background }) => (
  <span
    css={css`
      display: inline-block;
      width: ${SWATCH_WIDTH_PX}px;
      height: ${SWATCH_HEIGHT_PX}px;
      border-radius: 9999px;
      background: ${background};
    `}
  />
);

export const GanttLegend: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const items = GANTT_STATUS_LEGEND_ORDER.map((status) => ({
    key: status,
    sample: <PillSwatch background={ganttStatusColor(euiTheme, status)} />,
    label: ganttStatusLabel(status),
  }));

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      responsive={false}
      data-test-subj="ganttLegend"
    >
      {items.map(({ key, sample, label }) => (
        <EuiFlexItem grow={false} key={key}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{sample}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {label}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

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
  ALERT_TIMELINE_STATUS_LEGEND_ORDER,
  alertTimelineStatusColor,
  alertTimelineStatusLabel,
} from './alert_timeline_status_palette';

const DOT_SIZE_PX = 10;

interface SwatchProps {
  background: string;
}

const DotSwatch: React.FC<SwatchProps> = ({ background }) => (
  <span
    css={css`
      display: inline-block;
      width: ${DOT_SIZE_PX}px;
      height: ${DOT_SIZE_PX}px;
      border-radius: 50%;
      background: ${background};
    `}
  />
);

export const AlertTimelineLegend: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const items = ALERT_TIMELINE_STATUS_LEGEND_ORDER.map((status) => ({
    key: status,
    sample: <DotSwatch background={alertTimelineStatusColor(euiTheme, status)} />,
    label: alertTimelineStatusLabel(status),
  }));

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      responsive={false}
      data-test-subj="alertTimelineLegend"
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

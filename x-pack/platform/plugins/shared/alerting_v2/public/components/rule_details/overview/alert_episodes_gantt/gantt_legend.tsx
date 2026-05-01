/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const SWATCH_WIDTH_PX = 20;
const SWATCH_HEIGHT_PX = 8;

interface SwatchProps {
  background: string;
}

/**
 * Pill-shaped color sample used to preview the chart's bar styling in the
 * legend; sized to read at the same height as the surrounding `EuiText size="xs"`.
 */
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

  const items = [
    {
      key: 'recovered',
      sample: <PillSwatch background={euiTheme.colors.success} />,
      label: i18n.translate('xpack.alertingV2.ruleDetails.gantt.legendRecovered', {
        defaultMessage: 'Recovered episode',
      }),
    },
    {
      key: 'open',
      sample: (
        <PillSwatch
          background={`linear-gradient(to right, ${euiTheme.colors.danger} 60%, transparent)`}
        />
      ),
      label: i18n.translate('xpack.alertingV2.ruleDetails.gantt.legendOpen', {
        defaultMessage: 'Open episode (ongoing)',
      }),
    },
    {
      key: 'recovery-dot',
      sample: <EuiIcon type="dot" color={euiTheme.colors.textParagraph} size="s" />,
      label: i18n.translate('xpack.alertingV2.ruleDetails.gantt.legendRecoveryDot', {
        defaultMessage: 'Recovery',
      }),
    },
    {
      key: 'live-dot',
      sample: (
        <span
          css={css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: ${euiTheme.size.base};
            height: ${euiTheme.size.base};
            border-radius: 9999px;
            box-shadow: inset 0 0 0 1px ${euiTheme.colors.danger};
          `}
        >
          <EuiIcon type="dot" color={euiTheme.colors.danger} size="s" />
        </span>
      ),
      label: i18n.translate('xpack.alertingV2.ruleDetails.gantt.legendLiveDot', {
        defaultMessage: 'Live',
      }),
    },
  ];

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

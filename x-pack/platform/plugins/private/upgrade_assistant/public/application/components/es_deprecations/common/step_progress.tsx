/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, ReactNode } from 'react';

import { css } from '@emotion/react';

import {
  EuiIcon,
  EuiLoadingSpinner,
  useEuiTheme,
  shadeOrTint,
  makeHighContrastColor,
  tintOrShade,
  EuiThemeColorModeStandard,
  EuiThemeComputed,
} from '@elastic/eui';

type STATUS = 'incomplete' | 'inProgress' | 'complete' | 'failed' | 'paused' | 'cancelled';

const getStatusStyles = (euiTheme: EuiThemeComputed, colorMode: EuiThemeColorModeStandard) => {
  const { colors, size } = euiTheme;
  const baseStyle = css`
    width: ${size.base};
    height: ${size.base};
    margin-right: ${size.m};
  `;

  const getBackgroundColor = (color: string) => tintOrShade(color, 0.9, colorMode);

  const getCircleStyle = (color: string) => css`
    text-align: center;
    border-radius: ${size.m};
    line-height: calc(${size.base} - 2px);
    color: ${shadeOrTint(makeHighContrastColor(color)(getBackgroundColor(color)), 0, colorMode)};
    background-color: ${getBackgroundColor(color)};
  `;

  return {
    info: baseStyle,
    success: css`
      ${baseStyle};
      ${getCircleStyle(colors.success)};
    `,
    warning: css`
      ${baseStyle};
      ${getCircleStyle(colors.warning)};
    `,
    danger: css`
      ${baseStyle};
      ${getCircleStyle(colors.danger)};
    `,
  };
};

const StepStatus: React.FunctionComponent<{ status: STATUS; idx: number }> = ({ status, idx }) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const statusStyles = getStatusStyles(euiTheme, colorMode);

  const statusComponents = {
    incomplete: <span css={statusStyles.info}>{idx + 1}.</span>,
    inProgress: <EuiLoadingSpinner size="m" css={statusStyles.info} />,
    complete: (
      <span css={statusStyles.success}>
        <EuiIcon type="check" size="s" />
      </span>
    ),
    paused: (
      <span css={statusStyles.warning}>
        <EuiIcon type="pause" size="s" />
      </span>
    ),
    cancelled: (
      <span css={statusStyles.warning}>
        <EuiIcon type="cross" size="s" />
      </span>
    ),
    failed: (
      <span css={statusStyles.danger}>
        <EuiIcon type="cross" size="s" />
      </span>
    ),
  };

  if (!statusComponents[status]) {
    throw new Error(`Unsupported status: ${status}`);
  }

  return statusComponents[status];
};

const Step: React.FunctionComponent<StepProgressStep & { idx: number }> = ({
  title,
  status,
  children,
  idx,
}) => {
  const { euiTheme } = useEuiTheme();
  const { size, font } = euiTheme;

  const titleStyle = css`
    line-height: ${size.l};
    font-weight: ${status === 'inProgress' ? font.weight.bold : 'normal'};
  `;

  const contentStyle = css`
    display: block;
    margin-left: calc(${size.base} + ${size.m});
  `;

  const stepProgressStyle = css`
    display: flex;
    align-items: center;
    margin-top: ${size.s};
    margin-bottom: ${size.s};
    line-height: ${size.base};

    &:first-child {
      margin-top: ${size.base};
    }
  `;

  return (
    <Fragment>
      <div css={stepProgressStyle} data-test-subj="stepProgressStep">
        <StepStatus status={status} idx={idx} />
        <div css={titleStyle}>{title}</div>
      </div>
      {children && <div css={contentStyle}>{children}</div>}
    </Fragment>
  );
};

export interface StepProgressStep {
  title: React.ReactNode;
  status: STATUS;
  children?: ReactNode;
}

/**
 * A generic component that displays a series of automated steps and the system's progress.
 */
export const StepProgress: React.FunctionComponent<{
  steps: StepProgressStep[];
}> = ({ steps }) => {
  return (
    <div>
      {/* Use the index as the key only works here because these values do not change order after mounting. */}
      {steps.map((step, idx) => (
        <Step key={idx} {...step} idx={idx} />
      ))}
    </div>
  );
};

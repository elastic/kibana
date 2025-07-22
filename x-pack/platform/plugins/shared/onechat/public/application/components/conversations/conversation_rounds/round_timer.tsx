/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import React from 'react';

interface RoundTimerProps {
  elapsedTime: number;
  isStopped: boolean;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    // Under 1 hour: show minutes and seconds
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  }

  // Over 1 hour: show only hours and minutes (no seconds)
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

export const RoundTimer: React.FC<RoundTimerProps> = ({ elapsedTime, isStopped }) => {
  const { euiTheme } = useEuiTheme();

  const loadingStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    color: ${euiTheme.colors.textSubdued};
  `;

  const successStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSuccess};
    color: ${euiTheme.colors.success};
  `;

  return (
    <EuiBadge css={isStopped ? successStyles : loadingStyles}>
      {formatDuration(elapsedTime)}
    </EuiBadge>
  );
};

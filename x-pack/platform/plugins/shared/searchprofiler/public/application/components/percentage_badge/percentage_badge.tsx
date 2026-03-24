/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface Props {
  timePercentage: string;
  label: string;
  valueType?: 'percent' | 'time';
}

const useStyles = (valueType: 'percent' | 'time') => {
  const { euiTheme } = useEuiTheme();

  const color =
    valueType === 'percent'
      ? euiTheme.colors.backgroundLightPrimary
      : euiTheme.colors.backgroundLightDanger;

  return {
    percentBadge: css`
      border: none;
      display: block;
      background-image: linear-gradient(
        to right,
        ${color} 0%,
        ${color} var(--prfDevToolProgressPercentage, auto),
        ${euiTheme.colors.backgroundBaseSubdued} var(--prfDevToolProgressPercentage, auto),
        ${euiTheme.colors.backgroundBaseSubdued} 100%
      );
      width: ${valueType === 'percent'
        ? 'var(--prfDevToolBadgeSize)'
        : 'var(--prfDevToolBadgeSizeExtended)'};
    `,

    progressTextIE: css`
      display: none;
    `,
  };
};

/**
 * This component has IE specific provision for rendering the percentage portion of the badge correctly.
 *
 * This component uses CSS vars injected against the DOM element and resolves this in CSS to calculate
 * how far the percent bar should be drawn.
 */
export const PercentageBadge = ({ timePercentage, label, valueType = 'percent' }: Props) => {
  const { euiTheme } = useEuiTheme();
  const styles = useStyles(valueType);

  // Calculate badge sizes once
  const badgeSize = useMemo(() => euiTheme.base * 5.5, [euiTheme.base]);
  const extendedBadgeSize = useMemo(
    () => badgeSize * 3 - parseFloat(euiTheme.size.xs) * 0.7,
    [badgeSize, euiTheme.size.xs]
  );

  return (
    <EuiBadge
      css={styles.percentBadge}
      className="euiTextAlign--center"
      color={euiTheme.colors.backgroundBaseSubdued}
      style={
        {
          '--prfDevToolProgressPercentage': timePercentage + '%',
          '--prfDevToolBadgeSize': `${badgeSize}px`,
          '--prfDevToolBadgeSizeExtended': `${extendedBadgeSize}px`,
        } as React.CSSProperties
      }
    >
      <span css={styles.progressTextIE} style={{ width: timePercentage + '%' }} />
      <span>{label}</span>
    </EuiBadge>
  );
};

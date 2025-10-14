/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface EvaluatorBadgesGroupProps {
  relevance: number;
  precision: number;
  completeness: number;
  variant?: 'default' | 'conversation-average';
}

const getBadgeColor = (score: number) => (score > 0.7 ? 'success' : 'danger');
const getBadgeIcon = (score: number) => (score > 0.7 ? 'check' : 'alert');

export const EvaluatorBadgesGroup: React.FC<EvaluatorBadgesGroupProps> = ({
  relevance,
  precision,
  completeness,
  variant = 'default',
}) => {
  const { euiTheme } = useEuiTheme();

  const getBadgeColorForVariant = (score: number) => {
    if (variant === 'conversation-average') {
      return 'hollow'; // Neutral hollow style for conversation averages
    }
    return getBadgeColor(score);
  };

  const getBadgeIconForVariant = (score: number) => {
    if (variant === 'conversation-average') {
      return undefined; // No icons for conversation averages
    }
    return getBadgeIcon(score);
  };

  const averageBadgeStyles = css`
    background-color: #dbeafe !important; /* light blue */
    color: #1e3a8a !important; /* dark blue text */
    border: 1px solid #93c5fd !important; /* light blue border */
  `;

  return (
    <div style={{ display: 'flex', gap: euiTheme.size.s }}>
      <EuiBadge
        color={getBadgeColorForVariant(relevance)}
        iconType={getBadgeIconForVariant(relevance)}
        css={variant === 'conversation-average' ? averageBadgeStyles : undefined}
      >
        Relevance: {relevance.toFixed(2)}/1
      </EuiBadge>
      <EuiBadge
        color={getBadgeColorForVariant(precision)}
        iconType={getBadgeIconForVariant(precision)}
        css={variant === 'conversation-average' ? averageBadgeStyles : undefined}
      >
        Precision: {precision.toFixed(2)}/1
      </EuiBadge>
      <EuiBadge
        color={getBadgeColorForVariant(completeness)}
        iconType={getBadgeIconForVariant(completeness)}
        css={variant === 'conversation-average' ? averageBadgeStyles : undefined}
      >
        Completeness: {completeness.toFixed(2)}/1
      </EuiBadge>
    </div>
  );
};

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
  relevance?: number;
  precision?: number;
  recall?: number;
  groundedness?: number;
  regex?: number;
  criteria?: number;
  variant?: 'default' | 'conversation-average';
}

const getBadgeColor = (score: number) => (score > 0.7 ? 'success' : 'danger');
const getBadgeIcon = (score: number) => (score > 0.7 ? 'check' : 'alert');

export const EvaluatorBadgesGroup: React.FC<EvaluatorBadgesGroupProps> = ({
  relevance,
  precision,
  recall,
  groundedness,
  regex,
  criteria,
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

  // Create array of evaluation data for dynamic rendering
  const evaluations = [
    { key: 'relevance', value: relevance, label: 'Relevance' },
    { key: 'groundedness', value: groundedness, label: 'Groundedness' },
    { key: 'criteria', value: criteria, label: 'Criteria' },
    { key: 'regex', value: regex, label: 'Regex' },
    { key: 'recall', value: recall, label: 'Recall' },
    { key: 'precision', value: precision, label: 'Precision' },
  ].filter((x) => x.value !== undefined);

  return (
    <div
      style={{
        display: 'flex',
        gap: euiTheme.size.s,
        flexDirection: variant === 'conversation-average' ? 'row' : 'column',
      }}
    >
      {evaluations.map(({ key, value, label }) => (
        <EuiBadge
          key={key}
          color={getBadgeColorForVariant(value!)}
          iconType={getBadgeIconForVariant(value!)}
          css={variant === 'conversation-average' ? averageBadgeStyles : undefined}
          style={{ alignSelf: 'flex-start', marginInlineStart: 0 }}
        >
          {label}: {value!.toFixed(2)}/1
        </EuiBadge>
      ))}
    </div>
  );
};

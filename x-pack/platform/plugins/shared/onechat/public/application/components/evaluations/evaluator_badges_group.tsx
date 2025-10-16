/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

const getEvaluatorConfig = (key: string, value: number) => {
  const configs: Record<string, { label: string; icon: React.ReactNode }> = {
    relevance: {
      label: 'Relevance',
      icon: '📊',
    },
    precision: {
      label: 'Precision',
      icon: '🎯',
    },
    recall: {
      label: 'Recall',
      icon: '✔️',
    },
    groundedness: {
      label: 'Groundedness',
      icon: '🔗',
    },
    regex: {
      label: 'Regex',
      icon: '🔍',
    },
    criteria: {
      label: 'Criteria',
      icon: '📋',
    },
  };
  return configs[key] || configs.relevance;
};

const colorMap = {
  good: {
    text: '#017d73',
    background: '#d3f8d3',
  },
  bad: {
    text: '#8b0000',
    background: '#ffe6e6',
  },
};

// eslint-disable-next-line @elastic/eui/no-css-color
const badgeStyles = css`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: default;
  width: 100%;
  justify-content: flex-start;
`;

export const EvaluatorBadgesGroup: React.FC<EvaluatorBadgesGroupProps> = ({
  relevance,
  precision,
  recall,
  groundedness,
  regex,
  criteria,
  variant = 'default',
}) => {
  // Create array of evaluation data for dynamic rendering
  const evaluations = [
    { key: 'relevance', value: relevance },
    { key: 'groundedness', value: groundedness },
    { key: 'criteria', value: criteria },
    { key: 'regex', value: regex },
    { key: 'recall', value: recall },
    { key: 'precision', value: precision },
  ].filter((x) => x.value !== undefined);

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexDirection: variant === 'conversation-average' ? 'row' : 'column',
      }}
    >
      {evaluations.map(({ key, value }) => {
        const config = getEvaluatorConfig(key, value!);
        const isGoodScore = value! >= 0.5;

        return (
          <div
            key={key}
            css={badgeStyles}
            style={{
              backgroundColor:
                variant === 'conversation-average'
                  ? '#f3f4f6'
                  : isGoodScore
                  ? colorMap.good.background
                  : colorMap.bad.background,
              color:
                variant === 'conversation-average'
                  ? '#6b7280'
                  : isGoodScore
                  ? colorMap.good.text
                  : colorMap.bad.text,
            }}
          >
            {config.icon}
            <span>
              {config.label}: {value!.toFixed(2)}/1
            </span>
          </div>
        );
      })}
    </div>
  );
};

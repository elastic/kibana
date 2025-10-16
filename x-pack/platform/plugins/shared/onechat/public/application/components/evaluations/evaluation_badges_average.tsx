/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

interface EvaluatorBadgesGroupProps {
  relevanceScore?: number;
  precisionScore?: number;
  recallScore?: number;
  groundednessScore?: number;
  regexScore?: number;
  criteriaScore?: number;
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

export const EvaluatorBadgesAverage: React.FC<EvaluatorBadgesGroupProps> = ({
  relevanceScore,
  precisionScore,
  recallScore,
  groundednessScore,
  regexScore,
  criteriaScore,
}) => {
  // Create array of evaluation data for dynamic rendering
  const evaluations = [
    { key: 'relevance', value: relevanceScore },
    { key: 'groundedness', value: groundednessScore },
    { key: 'criteria', value: criteriaScore },
    { key: 'regex', value: regexScore },
    { key: 'recall', value: recallScore },
    { key: 'precision', value: precisionScore },
  ].filter((x) => x.value !== undefined);

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexDirection: 'row',
      }}
    >
      {evaluations.map(({ key, value }) => {
        const config = getEvaluatorConfig(key, value!);

        return (
          <div
            key={key}
            css={[badgeStyles]}
            style={{
              // eslint-disable-next-line @elastic/eui/no-css-color
              backgroundColor: '#f3f4f6',
              // eslint-disable-next-line @elastic/eui/no-css-color
              color: '#6b7280',
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

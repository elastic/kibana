/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EvaluationScore } from '@kbn/onechat-common/chat/conversation';

interface EvaluatorBadgesRoundProps {
  relevance?: EvaluationScore;
  precision?: EvaluationScore;
  recall?: EvaluationScore;
  groundedness?: EvaluationScore;
  regex?: EvaluationScore;
  criteria?: EvaluationScore;
  optimizer?: EvaluationScore;
  pii?: EvaluationScore;
  variant?: 'default' | 'conversation-average';
  openFlyout?: (content: Record<string, any>) => void;
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
    optimizer: {
      label: 'Optimizer',
      icon: '🚀',
    },
    pii: {
      label: 'PII Detection',
      icon: '🔒',
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

export const EvaluatorBadgesRound: React.FC<EvaluatorBadgesRoundProps> = ({
  relevance,
  precision,
  recall,
  groundedness,
  regex,
  criteria,
  optimizer,
  pii,
  variant = 'default',
  openFlyout,
}) => {
  // Create array of evaluation data for dynamic rendering
  const evaluations = [
    { key: 'relevance', value: relevance?.score, analysis: relevance?.analysis },
    { key: 'groundedness', value: groundedness?.score, analysis: groundedness?.analysis },
    { key: 'criteria', value: criteria?.score, analysis: criteria?.analysis },
    { key: 'regex', value: regex?.score, analysis: regex?.analysis },
    { key: 'recall', value: recall?.score, analysis: recall?.analysis },
    { key: 'precision', value: precision?.score, analysis: precision?.analysis },
    { key: 'optimizer', value: optimizer?.score, analysis: optimizer?.analysis },
    { key: 'pii', value: pii?.score, analysis: pii?.analysis },
  ].filter((x) => x.value !== undefined);

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexDirection: variant === 'conversation-average' ? 'row' : 'column',
      }}
    >
      {evaluations.map(({ key, value, analysis }) => {
        const config = getEvaluatorConfig(key, value!);
        const isGoodScore = value! >= 0.5;
        const isConversationAverageVariant = variant === 'conversation-average';

        const handleOnClick = () => {
          if (!analysis) return;
          openFlyout?.(analysis);
        };

        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div
            key={key}
            css={[
              badgeStyles,
              analysis &&
                css`
                  cursor: pointer;
                  &:hover {
                    opacity: 0.7;
                  }
                `,
            ]}
            onClick={handleOnClick}
            style={{
              backgroundColor: isConversationAverageVariant
                ? '#f3f4f6'
                : isGoodScore
                ? colorMap.good.background
                : colorMap.bad.background,
              color: isConversationAverageVariant
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

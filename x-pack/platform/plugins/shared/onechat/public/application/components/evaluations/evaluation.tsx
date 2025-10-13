/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiSpacer, useEuiTheme, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useConversationRounds, useConversationTitle } from '../../hooks/use_conversation';
import { EvaluationRound } from './evaluation_round';
import { EvaluatorBadgesGroup } from './evaluator_badges_group';

// Mock average evaluation data - in real implementation, this would be calculated from all rounds
const MOCK_AVERAGE = {
  relevance: 0.89,
  precision: 0.76,
  completeness: 0.42,
};

export const Evaluation: React.FC = () => {
  const conversationRounds = useConversationRounds();
  const { euiTheme } = useEuiTheme();
  const { title: conversationTitle } = useConversationTitle();

  const evaluationContainerStyles = css`
    padding: ${euiTheme.size.base};
  `;

  return (
    <div css={evaluationContainerStyles}>
      {/* Conversation Header with Title and Average Badges */}
      <div>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText>
              <h2>{conversationTitle}</h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EvaluatorBadgesGroup
              relevance={MOCK_AVERAGE.relevance}
              precision={MOCK_AVERAGE.precision}
              completeness={MOCK_AVERAGE.completeness}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      <EuiSpacer size="l" />

      {/* Individual Rounds */}
      {conversationRounds.map((round, index) => (
        <React.Fragment key={round.id || index}>
          <EvaluationRound round={round} roundNumber={index + 1} />
          {index < conversationRounds.length - 1 && <EuiSpacer size="l" />}
        </React.Fragment>
      ))}
    </div>
  );
};

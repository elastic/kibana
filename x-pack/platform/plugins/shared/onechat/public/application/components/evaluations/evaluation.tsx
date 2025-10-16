/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiSpacer, useEuiTheme, EuiText, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import {
  useConversationRoundEvaluations,
  useConversationRounds,
  useConversationTitle,
} from '../../hooks/use_conversation';
import { EvaluationRound } from './evaluation_round';
import { EvaluatorBadgesGroup } from './evaluator_badges_group';
import { calculateAverages } from './utils/calculateEvaluationAverages';

export const Evaluation: React.FC = () => {
  const conversationRounds = useConversationRounds();
  const conversationRoundEvaluations = useConversationRoundEvaluations();
  const { euiTheme } = useEuiTheme();
  const { title: conversationTitle } = useConversationTitle();
  const averages = calculateAverages(conversationRoundEvaluations);

  const evaluationContainerStyles = css`
    padding: ${euiTheme.size.base};
  `;

  const titleSectionStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePrimary};
    padding: ${euiTheme.size.l};
  `;

  const titleStyles = css`
    color: ${euiTheme.colors.primaryText};
    margin: 0;
  `;

  const subtitleStyles = css`
    color: ${euiTheme.colors.subduedText};
    opacity: 0.8;
    margin: ${euiTheme.size.xs} 0 0 0;
  `;

  return (
    <div css={evaluationContainerStyles}>
      {/* Conversation Title Section */}
      <div css={titleSectionStyles}>
        <EuiText>
          <h1 css={titleStyles}>{conversationTitle}</h1>
        </EuiText>
        <EuiText size="s" css={subtitleStyles}>
          {conversationRounds.length} conversation rounds
        </EuiText>
      </div>

      {/* Conversation Average Section - only show if there are averages */}
      {Object.keys(averages).length > 0 && (
        <EuiPanel
          color="subdued"
          paddingSize="l"
          borderRadius="none"
          css={css`
            border-bottom: ${euiTheme.border.thin};
          `}
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>Conversation Average</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EvaluatorBadgesGroup
                relevance={averages.relevance ?? undefined}
                precision={averages.precision ?? undefined}
                recall={averages.recall ?? undefined}
                groundedness={averages.groundedness ?? undefined}
                regex={averages.regex ?? undefined}
                variant="conversation-average"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}

      {/* Individual Rounds */}
      <div
        css={css`
          padding: ${euiTheme.size.l};
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      >
        {conversationRounds.map((round, index) => (
          <React.Fragment key={round.id || index}>
            <EvaluationRound
              round={round}
              roundNumber={index + 1}
              roundEvaluation={round.evaluations}
            />
            {index < conversationRounds.length - 1 && <EuiSpacer size="l" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

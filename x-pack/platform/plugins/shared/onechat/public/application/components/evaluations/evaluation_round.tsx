/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiText,
  EuiButtonIcon,
  useEuiTheme,
  EuiPanel,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ConversationRound } from '@kbn/onechat-common';
import type { EvaluationScore } from '../../../../common/http_api/evaluations';
import { ChatMessageText } from '../conversations/conversation_rounds/chat_message_text';
import { useEvaluations } from '../../context/evaluations/evaluations_context';
import { RoundSteps } from '../conversations/conversation_rounds/round_thinking/steps/round_steps';
import { EvaluatorBadgesGroup } from './evaluator_badges_group';

interface EvaluationRoundProps {
  round: ConversationRound;
  roundNumber: number;
  roundEvaluation?: EvaluationScore[];
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

export const EvaluationRound: React.FC<EvaluationRoundProps> = ({
  round,
  roundNumber,
  roundEvaluation,
}) => {
  const { euiTheme } = useEuiTheme();
  const { showThinking } = useEvaluations();

  const relevanceScore = roundEvaluation?.find((score) => score.evaluatorId === 'relevance')?.score;
  const precisionScore = roundEvaluation?.find((score) => score.evaluatorId === 'precision')?.score;
  const recallScore = roundEvaluation?.find((score) => score.evaluatorId === 'recall')?.score;
  const groundednessScore = roundEvaluation?.find(
    (score) => score.evaluatorId === 'groundedness'
  )?.score;
  const regexScore = roundEvaluation?.find((score) => score.evaluatorId === 'regex')?.score;
  const criteriaScore = roundEvaluation?.find((score) => score.evaluatorId === 'criteria')?.score;

  const showAdditionalContent = [
    relevanceScore,
    precisionScore,
    recallScore,
    groundednessScore,
    regexScore,
    criteriaScore,
  ].some((score) => score !== undefined && score !== null);

  const inputPanelStyles = css`
    background-color: #f5f7fa;
    border: 2px solid #d3dae6;
    border-radius: 6px;
  `;

  const roundContainerStyles = css`
    border-radius: 8px;
    background-color: ${euiTheme.colors.emptyShade};
    padding: 24px;
  `;

  return (
    <div css={roundContainerStyles}>
      {/* Round Header */}
      <div
        css={css`
          margin-bottom: 12px;
        `}
      >
        <EuiText>
          <strong style={{ fontSize: '18px', color: euiTheme.colors.text }}>
            Round {roundNumber}
          </strong>
        </EuiText>
      </div>

      {/* Main Content */}
      <EuiFlexGroup gutterSize="l" alignItems="flexStart">
        {/* Left Column - Input and Response */}
        <EuiFlexItem grow={4}>
          <EuiFlexGroup direction="column" gutterSize="l">
            {/* Input Section */}
            <div css={inputPanelStyles}>
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                css={{ padding: '12px 16px' }}
              >
                <EuiText size="xs" css={{ fontWeight: 600, color: '#69707d' }}>
                  INPUT
                </EuiText>
                <EuiButtonIcon
                  iconType="copy"
                  size="s"
                  onClick={() => copyToClipboard(round.input.message)}
                  aria-label="Copy input"
                />
              </EuiFlexGroup>
              <div
                css={{
                  backgroundColor: euiTheme.colors.emptyShade,
                  padding: '16px',
                  borderBottomLeftRadius: '6px',
                  borderBottomRightRadius: '6px',
                }}
              >
                <EuiText size="s">{round.input.message}</EuiText>
              </div>
            </div>

            {/* Response Section */}
            <div css={inputPanelStyles}>
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                css={{ padding: '12px 16px' }}
              >
                <EuiText size="xs" css={{ fontWeight: 600, color: '#69707d' }}>
                  RESPONSE
                </EuiText>
                <EuiButtonIcon
                  iconType="copy"
                  size="s"
                  onClick={() => copyToClipboard(round.response.message)}
                  aria-label="Copy response"
                />
              </EuiFlexGroup>
              <div
                css={{
                  backgroundColor: euiTheme.colors.emptyShade,
                  padding: '16px',
                  borderBottomLeftRadius: '6px',
                  borderBottomRightRadius: '6px',
                }}
              >
                <ChatMessageText content={round.response.message} steps={round.steps} />
              </div>
            </div>

            {/* Agent Thinking Section - Only show when toggle is enabled */}
            {showThinking && round.steps && round.steps.length > 0 && (
              <div>
                <EuiText
                  size="xs"
                  css={{
                    fontWeight: 600,
                    color: euiTheme.colors.text,
                    marginBottom: euiTheme.size.m,
                  }}
                >
                  AGENT THINKING
                </EuiText>
                <EuiPanel paddingSize="l" hasShadow={false} hasBorder={false} color="subdued">
                  <RoundSteps steps={round.steps} />
                </EuiPanel>
              </div>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Right Column - Reviews - Only render if there's content */}
        {showAdditionalContent && (
          <EuiFlexItem grow={false} style={{ width: '300px' }}>
            <EuiFlexGroup direction="column" gutterSize="l">
              {/* Quantitative Review */}
              <div>
                <EuiText
                  size="xs"
                  css={{
                    fontWeight: 600,
                    color: euiTheme.colors.text,
                    marginBottom: euiTheme.size.s,
                  }}
                >
                  QUANTITATIVE REVIEW
                </EuiText>
                <EvaluatorBadgesGroup
                  relevance={relevanceScore}
                  precision={precisionScore}
                  recall={recallScore}
                  groundedness={groundednessScore}
                  regex={regexScore}
                  criteria={criteriaScore}
                />
              </div>
              <EuiHorizontalRule margin="xs" />
              {/* Qualitative Review */}
              <div>
                <EuiText
                  size="xs"
                  css={{
                    fontWeight: 600,
                    color: euiTheme.colors.text,
                    marginBottom: euiTheme.size.s,
                  }}
                >
                  QUALITATIVE REVIEW
                </EuiText>
                <div
                  css={{
                    border: `2px dashed ${euiTheme.colors.lightShade}`,
                    borderRadius: euiTheme.border.radius.small,
                    padding: euiTheme.size.m,
                    height: '300px',
                    backgroundColor: euiTheme.colors.lightestShade,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EuiText
                    size="xs"
                    css={{ color: euiTheme.colors.subduedText, textAlign: 'center' }}
                  >
                    Structured JSON for qualitative evaluators goes here...
                  </EuiText>
                </div>
              </div>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};

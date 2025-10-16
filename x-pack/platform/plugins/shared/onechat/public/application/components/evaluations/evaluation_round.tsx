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
  EuiSplitPanel,
  useEuiTheme,
  EuiSpacer,
  EuiPanel,
  EuiFlexItem,
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
  const showAdditionalContent =
    relevanceScore ||
    precisionScore ||
    recallScore ||
    groundednessScore ||
    regexScore ||
    criteriaScore;

  const inputPanelStyles = css`
    border-radius: ${euiTheme.border.radius.small};
    background-color: ${euiTheme.colors.backgroundBasePrimary};
    padding: ${euiTheme.size.m};
  `;

  const responsePanelStyles = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.small};
    padding: ${euiTheme.size.m};
  `;

  return (
    <EuiSplitPanel.Outer>
      {/* Header Panel */}
      <EuiSplitPanel.Inner color="subdued">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiText>
              <strong>Round {roundNumber}</strong>
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>

      {/* Content Panel */}
      <EuiSplitPanel.Inner css={{ padding: euiTheme.size.l }}>
        <EuiFlexGroup gutterSize="l">
          {/* Left Column - 80% width */}
          <EuiFlexItem direction="column" grow={4}>
            {/* Input Section */}
            <div>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiText size="xs">
                  <strong>INPUT</strong>
                </EuiText>
                <EuiButtonIcon
                  iconType="copy"
                  size="s"
                  onClick={() => copyToClipboard(round.input.message)}
                  aria-label="Copy input"
                />
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <div css={inputPanelStyles}>
                <EuiText size="s">{round.input.message}</EuiText>
              </div>
            </div>

            <EuiSpacer size="l" />

            {/* Response Section */}
            <div>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiText size="xs">
                  <strong>RESPONSE</strong>
                </EuiText>
                <EuiButtonIcon
                  iconType="copy"
                  size="s"
                  onClick={() => copyToClipboard(round.response.message)}
                  aria-label="Copy response"
                />
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <div css={responsePanelStyles}>
                <ChatMessageText content={round.response.message} steps={round.steps} />
              </div>
            </div>

            {/* Agent Thinking Section - Only show when toggle is enabled */}
            {showThinking && round.steps && round.steps.length > 0 && (
              <>
                <EuiSpacer size="l" />
                <div>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiText size="xs">
                      <strong>AGENT THINKING</strong>
                    </EuiText>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                  <EuiPanel paddingSize="l" hasShadow={false} hasBorder={false} color="subdued">
                    <RoundSteps steps={round.steps} />
                  </EuiPanel>
                </div>
              </>
            )}
          </EuiFlexItem>

          {/* Right Column - 20% width - Only render if there's content */}
          {showAdditionalContent && (
            <EuiFlexItem grow={false} style={{ width: '20%' }}>
              <EuiText size="xs">
                <strong>Quantitative Review</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGroup direction="column" style={{ flexGrow: 0 }}>
                <EvaluatorBadgesGroup
                  relevance={relevanceScore}
                  precision={precisionScore}
                  recall={recallScore}
                  groundedness={groundednessScore}
                  regex={regexScore}
                  criteria={criteriaScore}
                />
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiText size="xs">
                <strong>Qualitative Review</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <div
                style={{
                  border: euiTheme.border.thin,
                  borderRadius: euiTheme.border.radius.small,
                  padding: euiTheme.size.m,
                  height: '300px',
                }}
              >
                <EuiText size="xs">
                  Structured JSON for qualitative evaluators goes here....
                </EuiText>
              </div>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

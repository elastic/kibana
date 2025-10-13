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
  EuiBadge,
  EuiButtonIcon,
  EuiSplitPanel,
  useEuiTheme,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ConversationRound } from '@kbn/onechat-common';
import { ChatMessageText } from '../conversations/conversation_rounds/chat_message_text';

interface EvaluationRoundProps {
  round: ConversationRound;
  roundNumber: number;
}

const MOCK_EVALUATION_DATA = {
  relevance: 0.96,
  precision: 0.74,
  completeness: 0.35,
};

const getBadgeColor = (score: number) => (score > 0.7 ? 'success' : 'danger');
const getBadgeIcon = (score: number) => (score > 0.7 ? 'check' : 'alert');

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

export const EvaluationRound: React.FC<EvaluationRoundProps> = ({ round, roundNumber }) => {
  const { euiTheme } = useEuiTheme();

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
          <div style={{ display: 'flex', gap: euiTheme.size.s }}>
            <EuiBadge
              color={getBadgeColor(MOCK_EVALUATION_DATA.relevance)}
              iconType={getBadgeIcon(MOCK_EVALUATION_DATA.relevance)}
            >
              Relevance: {MOCK_EVALUATION_DATA.relevance.toFixed(2)}/1
            </EuiBadge>
            <EuiBadge
              color={getBadgeColor(MOCK_EVALUATION_DATA.precision)}
              iconType={getBadgeIcon(MOCK_EVALUATION_DATA.precision)}
            >
              Precision: {MOCK_EVALUATION_DATA.precision.toFixed(2)}/1
            </EuiBadge>
            <EuiBadge
              color={getBadgeColor(MOCK_EVALUATION_DATA.completeness)}
              iconType={getBadgeIcon(MOCK_EVALUATION_DATA.completeness)}
            >
              Completeness: {MOCK_EVALUATION_DATA.completeness.toFixed(2)}/1
            </EuiBadge>
          </div>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>

      {/* Content Panel */}
      <EuiSplitPanel.Inner css={{ padding: euiTheme.size.l }}>
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
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ConversationRound } from '@kbn/onechat-common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { RoundAnswer } from './round_answer';

interface RoundProps {
  round: ConversationRound;
}

export const Round: React.FC<RoundProps> = ({ round }) => {
  const { input } = round;
  const { euiTheme } = useEuiTheme();
  const userMessageContainerStyles = css`
    width: 100%;
    align-self: end;
    max-inline-size: 80%;
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;
  const labels = {
    container: i18n.translate('xpack.onechat.round.container', {
      defaultMessage: 'Conversation round',
    }),
    userMessage: i18n.translate('xpack.onechat.round.userMessage', {
      defaultMessage: 'User message',
    }),
    assistantResponse: i18n.translate('xpack.onechat.round.assistantResponse', {
      defaultMessage: 'Assistant response',
    }),
  };
  return (
    <EuiFlexGroup direction="column" gutterSize="l" aria-label={labels.container}>
      <EuiPanel
        css={userMessageContainerStyles}
        paddingSize="l"
        hasShadow={false}
        hasBorder={false}
        aria-label={labels.userMessage}
      >
        <EuiText size="s">{input.message}</EuiText>
      </EuiPanel>

      <EuiPanel hasShadow={false} hasBorder={false} aria-label={labels.assistantResponse}>
        <RoundAnswer round={round} />
      </EuiPanel>
    </EuiFlexGroup>
  );
};

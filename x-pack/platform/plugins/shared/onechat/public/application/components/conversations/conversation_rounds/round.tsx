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
    max-inline-size: calc(${euiTheme.size.xxxxl} * 10);
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiPanel
        css={userMessageContainerStyles}
        paddingSize="l"
        hasShadow={false}
        hasBorder={false}
      >
        <EuiText size="s">{input.message}</EuiText>
      </EuiPanel>

      <EuiPanel hasShadow={false} hasBorder={false}>
        <RoundAnswer round={round} />
      </EuiPanel>
    </EuiFlexGroup>
  );
};

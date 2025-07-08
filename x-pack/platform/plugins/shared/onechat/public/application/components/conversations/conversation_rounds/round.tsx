/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import { EuiPanel, EuiText, useEuiTheme, useEuiFontSize } from '@elastic/eui';
import { ConversationRound } from '@kbn/onechat-common';
import { RoundAnswer } from './round_answer';

interface RoundProps {
  round: ConversationRound;
}

export const Round: React.FC<RoundProps> = ({ round }) => {
  const { euiTheme } = useEuiTheme();

  const { input } = round;

  const rootPanelClass = css`
    margin-bottom: ${euiTheme.size.xl};
  `;

  const tabContentPanelClass = css`
    padding: ${euiTheme.size.xxl};
  `;

  const userTextContainerClass = css`
    padding: ${euiTheme.size.xxl} ${euiTheme.size.xxl} ${euiTheme.size.xl} ${euiTheme.size.xxl};
  `;

  const userMessageTextClass = css`
    font-weight: ${euiTheme.font.weight.regular};
    font-size: calc(${useEuiFontSize('m').fontSize} + 4px);
  `;

  return (
    <EuiPanel
      className={rootPanelClass}
      borderRadius="none"
      paddingSize="none"
      hasShadow={false}
      hasBorder={true}
    >
      <div className={userTextContainerClass}>
        <EuiText color="subdued" size="m" className={userMessageTextClass}>
          “{input.message}“
        </EuiText>
      </div>

      <div className={tabContentPanelClass}>
        <RoundAnswer key={`round-answer-tab`} round={round} />
      </div>
    </EuiPanel>
  );
};

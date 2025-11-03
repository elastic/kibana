/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { ConversationContentWithMargins } from './conversation_grid';
import { useConversationGridCenterColumnWidth } from './conversation_grid.styles';

interface FullScreenNewConversationPromptProps {
  welcomeText: React.ReactNode;
  inputForm: React.ReactNode;
  navigationCards?: React.ReactNode;
}

export const FullScreenNewConversationPrompt: React.FC<FullScreenNewConversationPromptProps> = ({
  welcomeText,
  inputForm,
  navigationCards,
}) => {
  const { euiTheme } = useEuiTheme();
  const centerColumnWidth = useConversationGridCenterColumnWidth();
  const inputRowHeight = `calc(${euiTheme.size.l} * 7)`;

  const gridStyles = css`
    display: grid;
    grid-template-columns: 1fr ${centerColumnWidth} 1fr;
    grid-template-rows: auto ${inputRowHeight} auto;
    row-gap: ${euiTheme.size.l};
  `;

  const mainContainerStyles = css`
    grid-column: 2;
  `;

  const withMarginContainerStyles = css`
    grid-column: 1 / 4;
  `;

  const fullHeightStyles = css`
    height: 100%;
  `;

  return (
    <ConversationContentWithMargins css={fullHeightStyles}>
      <div css={gridStyles} data-test-subj="agentBuilderWelcomePage">
        <div css={mainContainerStyles}>{welcomeText}</div>
        <div css={withMarginContainerStyles}>{inputForm}</div>
        {navigationCards && <div css={withMarginContainerStyles}>{navigationCards}</div>}
      </div>
    </ConversationContentWithMargins>
  );
};

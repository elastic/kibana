/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { ConversationActions } from './conversation_actions';
import { ConversationsHistoryButton } from './conversations_history/conversations_history_button';
import { ConversationTitle } from './conversation_title';

interface ConversationHeaderProps {
  onClose?: () => void;
  ariaLabelledBy?: string;
}
export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  onClose,
  ariaLabelledBy,
}) => {
  const containerStyles = css`
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
  `;

  const sectionStyles = css`
    flex: 1;
    display: flex;
    align-items: center;
  `;

  const leftSectionStyles = css`
    ${sectionStyles}
    justify-content: flex-start;
  `;

  const centerSectionStyles = css`
    ${sectionStyles}
    justify-content: center;
  `;

  const rightSectionStyles = css`
    ${sectionStyles}
    justify-content: flex-end;
  `;

  return (
    <div css={containerStyles}>
      <div css={leftSectionStyles}>
        <ConversationsHistoryButton />
      </div>
      <div css={centerSectionStyles}>
        <ConversationTitle ariaLabelledBy={ariaLabelledBy} />
      </div>
      <div css={rightSectionStyles}>
        <ConversationActions onClose={onClose} />
      </div>
    </div>
  );
};

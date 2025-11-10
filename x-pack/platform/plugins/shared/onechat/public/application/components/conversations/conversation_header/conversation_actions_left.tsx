/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ConversationsHistoryButton } from './conversations_history_button';
import { useHasActiveConversation } from '../../../hooks/use_conversation';
import { NewConversationButton } from './new_conversation_button';

export const ConversationLeftActions: React.FC<{}> = () => {
  const hasActiveConversation = useHasActiveConversation();
  const { euiTheme } = useEuiTheme();

  const actionsContainerStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
    align-items: center;
  `;

  return (
    <div css={actionsContainerStyles}>
      <ConversationsHistoryButton />
      {hasActiveConversation && <NewConversationButton iconOnly />}
    </div>
  );
};

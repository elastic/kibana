/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';
import { ConversationRoundsLayout } from './conversation_rounds_layout';
import { ConversationInputLayout } from './conversation_input_layout';
import { NewConversationPromptLayout } from './new_conversation_prompt_layout';
import {
  ConversationCenter,
  ConversationGrid,
  ConversationLeft,
  ConversationRight,
} from '../conversation_grid';
import { useHasActiveConversation } from '../../../hooks/use_conversation';
import { ConversationActions } from '../conversation_actions';
import { ConversationTitle } from '../conversation_title';
import { ConversationSidebarToggle } from '../conversation_sidebar/conversation_sidebar_toggle';

export interface FullScreenConversationHeaderProps {
  sidebar?: {
    isOpen: boolean;
    onToggle: () => void;
  };
}

// Full-screen conversation header with 5-column grid layout.
// Includes sidebar toggle (left), title (center), and actions (right).
export const FullScreenConversationHeader: React.FC<FullScreenConversationHeaderProps> = ({
  sidebar,
}) => {
  const hasActiveConversation = useHasActiveConversation();

  return (
    <ConversationGrid>
      {sidebar && (
        <ConversationLeft>
          <ConversationSidebarToggle isSidebarOpen={sidebar.isOpen} onToggle={sidebar.onToggle} />
        </ConversationLeft>
      )}
      {hasActiveConversation && (
        <ConversationCenter>
          <ConversationTitle />
        </ConversationCenter>
      )}
      {hasActiveConversation && (
        <ConversationRight>
          <ConversationActions />
        </ConversationRight>
      )}
    </ConversationGrid>
  );
};

export const FullScreenConversationRounds: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <ConversationRoundsLayout>{children}</ConversationRoundsLayout>;
};

export const FullScreenConversationInput: React.FC<{
  children: React.ReactNode;
  className?: string | SerializedStyles;
}> = ({ children, className }) => {
  return <ConversationInputLayout className={className}>{children}</ConversationInputLayout>;
};

const fullHeightStyles = css`
  height: 100%;
`;

export const FullScreenNewConversationPrompt: React.FC<{
  welcomeText: React.ReactNode;
  inputForm: React.ReactNode;
  navigationCards?: React.ReactNode;
}> = ({ welcomeText, inputForm, navigationCards }) => {
  return (
    <NewConversationPromptLayout
      welcomeText={welcomeText}
      inputForm={inputForm}
      navigationCards={navigationCards}
      className={fullHeightStyles}
    />
  );
};

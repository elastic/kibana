/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  useConversationTitle,
  useHasActiveConversation,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
import { RenameConversationInput } from './rename_conversation_input';

const labels = {
  ariaLabel: i18n.translate('xpack.agentBuilder.conversationTitle.ariaLabel', {
    defaultMessage: 'Conversation title',
  }),
  rename: i18n.translate('xpack.agentBuilder.conversationTitle.rename', {
    defaultMessage: 'Rename conversation',
  }),
  newConversation: i18n.translate('xpack.agentBuilder.conversationTitle.newConversation', {
    defaultMessage: 'New conversation',
  }),
};

interface ConversationTitleProps {
  ariaLabelledBy?: string;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

export const ConversationTitle: React.FC<ConversationTitleProps> = ({
  ariaLabelledBy,
  isEditing,
  setIsEditing,
}) => {
  const { title, isLoading } = useConversationTitle();
  const hasActiveConversation = useHasActiveConversation();
  const hasPersistedConversation = useHasPersistedConversation();
  const { euiTheme } = useEuiTheme();
  const [previousTitle, setPreviousTitle] = useState('');
  const [currentText, setCurrentText] = useState('');

  useEffect(() => {
    if (isLoading || !hasActiveConversation) return;

    const fullText = title || labels.newConversation;

    // Typewriter: ONLY when transitioning from "New conversation" to actual title
    if (previousTitle === labels.newConversation && title) {
      if (currentText.length < fullText.length) {
        const timeout = setTimeout(() => {
          setCurrentText(fullText.substring(0, currentText.length + 1));
        }, 50);
        return () => clearTimeout(timeout);
      }
    } else if (title && title !== previousTitle) {
      // Normal title change: immediate
      setCurrentText(fullText);
    } else if (!title) {
      // Reset when switching to new conversation (no title)
      setCurrentText('');
    }

    // Always track the previous title
    setPreviousTitle(fullText);
  }, [title, currentText, isLoading, previousTitle, hasActiveConversation]);

  const displayedTitle = currentText || previousTitle;

  const handleRenameClick = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const shouldShowTitle = hasActiveConversation;
  if (!shouldShowTitle) {
    return null;
  }

  if (isEditing) {
    return <RenameConversationInput onCancel={handleCancel} />;
  }

  // Only show rename icon when there is a persisted conversation ID
  const canRename = hasPersistedConversation;

  return (
    <div
      css={css`
        display: inline-flex;
        max-width: 100%;
        align-items: center;
        gap: ${euiTheme.size.xs};
      `}
      data-test-subj="agentBuilderConversationTitle"
    >
      <h4
        id={ariaLabelledBy}
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
          flex: 0 1 auto;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        {displayedTitle}
      </h4>
      {canRename && (
        <EuiButtonIcon
          iconType="arrowRight"
          aria-label={labels.rename}
          onClick={handleRenameClick}
          color="text"
          size="xs"
          data-test-subj="agentBuilderConversationRenameButton"
        />
      )}
    </div>
  );
};

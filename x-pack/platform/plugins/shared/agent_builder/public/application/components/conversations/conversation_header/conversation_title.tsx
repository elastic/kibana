/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
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
  const [isHovering, setIsHovering] = useState(false);
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

  const handlePencilClick = () => {
    setIsEditing(true);
    setIsHovering(false);
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

  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  // Only show rename icon when there is a conversation ID !== 'new'
  const canRename = hasPersistedConversation;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-test-subj="agentBuilderConversationTitle"
    >
      <EuiFlexItem grow={false}>
        <h4 id={ariaLabelledBy} css={titleStyles}>
          {displayedTitle}
        </h4>
      </EuiFlexItem>
      {canRename && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="pencil"
            aria-label={labels.rename}
            onClick={handlePencilClick}
            color="text"
            data-test-subj="agentBuilderConversationRenameButton"
            css={css`
              opacity: ${isHovering ? 1 : 0};
              transition: opacity 0.2s ease;
            `}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

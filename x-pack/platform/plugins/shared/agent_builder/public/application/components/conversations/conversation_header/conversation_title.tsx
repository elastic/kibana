/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationTitle, useHasActiveConversation } from '../../../hooks/use_conversation';
import { RenameConversationInput } from './rename_conversation_input';

const labels = {
  ariaLabel: i18n.translate('xpack.onechat.conversationTitle.ariaLabel', {
    defaultMessage: 'Conversation title',
  }),
  rename: i18n.translate('xpack.onechat.conversationTitle.rename', {
    defaultMessage: 'Rename conversation',
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
  const [isHovering, setIsHovering] = useState(false);

  const shouldShow = hasActiveConversation && !isLoading && title;

  const handlePencilClick = () => {
    setIsEditing(true);
    setIsHovering(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (!shouldShow) {
    return null;
  }

  if (isEditing) {
    return <RenameConversationInput onCancel={handleCancel} />;
  }

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
        <h1 id={ariaLabelledBy}>{title}</h1>
      </EuiFlexItem>
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
    </EuiFlexGroup>
  );
};

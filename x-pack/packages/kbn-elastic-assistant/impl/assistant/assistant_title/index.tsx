/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiInlineEditTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Conversation } from '../../..';
import { AssistantAvatar } from '../assistant_avatar/assistant_avatar';
import { useConversation } from '../use_conversation';
import { NEW_CHAT } from '../conversations/conversation_sidepanel/translations';

/**
 * Renders a header title, a tooltip button, and a popover with
 * information about the assistant feature and access to documentation.
 */
export const AssistantTitle: React.FC<{
  title?: string;
  selectedConversation: Conversation | undefined;
  refetchConversationsState: () => Promise<void>;
}> = ({ title, selectedConversation, refetchConversationsState }) => {
  const [newTitle, setNewTitle] = useState(title);
  const [newTitleError, setNewTitleError] = useState(false);
  const { updateConversationTitle } = useConversation();

  const handleUpdateTitle = useCallback(
    async (updatedTitle: string) => {
      setNewTitleError(false);

      if (selectedConversation) {
        await updateConversationTitle({
          conversationId: selectedConversation.id,
          updatedTitle,
        });
        await refetchConversationsState();
      }
    },
    [refetchConversationsState, selectedConversation, updateConversationTitle]
  );

  useEffect(() => {
    // Reset the title when the prop changes
    setNewTitle(title);
  }, [title]);

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center">
      <EuiFlexItem grow={false}>
        <AssistantAvatar data-test-subj="titleIcon" size={'s'} />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          overflow: hidden;
        `}
      >
        <EuiInlineEditTitle
          heading="h2"
          inputAriaLabel="Edit text inline"
          value={newTitle ?? NEW_CHAT}
          size="xs"
          isInvalid={!!newTitleError}
          isReadOnly={selectedConversation?.isDefault}
          onChange={(e) => setNewTitle(e.currentTarget.nodeValue || '')}
          onCancel={() => setNewTitle(title)}
          onSave={handleUpdateTitle}
          editModeProps={{
            formRowProps: {
              fullWidth: true,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

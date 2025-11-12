/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationTitle, useHasActiveConversation } from '../../../hooks/use_conversation';
import { useDeleteConversationModal } from '../../../hooks/use_delete_conversation_modal';
import { useRenameConversationModal } from '../../../hooks/use_rename_conversation_modal';

const labels = {
  ariaLabel: i18n.translate('xpack.onechat.conversationTitle.ariaLabel', {
    defaultMessage: 'Conversation title',
  }),
  newConversationDisplay: i18n.translate('xpack.onechat.conversationTitle.newConversationDisplay', {
    defaultMessage: 'New conversation',
  }),
  rename: i18n.translate('xpack.onechat.conversationTitle.rename', {
    defaultMessage: 'Rename',
  }),
  delete: i18n.translate('xpack.onechat.conversationTitle.delete', {
    defaultMessage: 'Delete',
  }),
};

interface ConversationTitleProps {
  ariaLabelledBy?: string;
}

export const ConversationTitle: React.FC<ConversationTitleProps> = ({ ariaLabelledBy }) => {
  const { title, isLoading } = useConversationTitle();
  const hasActiveConversation = useHasActiveConversation();
  const { euiTheme } = useEuiTheme();
  const { openDeleteModal, DeleteModal } = useDeleteConversationModal();
  const { openRenameModal, RenameModal } = useRenameConversationModal();

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const getTitle = () => {
    if (hasActiveConversation) {
      return title;
    }
    return labels.newConversationDisplay;
  };

  const displayTitle = getTitle();
  const shouldShowButton = hasActiveConversation && !isLoading && title;

  const menuItems = [
    <EuiContextMenuItem
      key="rename"
      icon="pencil"
      size="s"
      data-test-subj="agentBuilderConversationRenameButton"
      onClick={() => {
        setIsContextMenuOpen(false);
        openRenameModal();
      }}
    >
      {labels.rename}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      size="s"
      css={css`
        color: ${euiTheme.colors.textDanger};
      `}
      data-test-subj="agentBuilderConversationDeleteButton"
      onClick={() => {
        setIsContextMenuOpen(false);
        openDeleteModal();
      }}
    >
      {labels.delete}
    </EuiContextMenuItem>,
  ];

  if (shouldShowButton) {
    return (
      <>
        <EuiPopover
          button={
            <EuiButtonEmpty
              onClick={() => setIsContextMenuOpen(!isContextMenuOpen)}
              aria-label={labels.ariaLabel}
              iconType="arrowDown"
              iconSide="right"
              color="text"
              data-test-subj="agentBuilderConversationTitle"
            >
              <h1 id={ariaLabelledBy}>{displayTitle}</h1>
            </EuiButtonEmpty>
          }
          isOpen={isContextMenuOpen}
          closePopover={() => setIsContextMenuOpen(false)}
          panelPaddingSize="s"
          anchorPosition="downCenter"
        >
          <EuiContextMenuPanel size="s" items={menuItems} />
        </EuiPopover>
        {DeleteModal}
        {RenameModal}
      </>
    );
  }

  return null;
};

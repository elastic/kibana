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
import { DeleteConversationModal } from './delete_conversation_modal';
import { RenameConversationModal } from './rename_conversation_modal';

const labels = {
  ariaLabel: i18n.translate('xpack.onechat.conversationTitle.ariaLabel', {
    defaultMessage: 'Conversation title',
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
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  const shouldShowButton = hasActiveConversation && !isLoading && title;

  const menuItems = [
    <EuiContextMenuItem
      key="rename"
      icon="pencil"
      size="s"
      data-test-subj="agentBuilderConversationRenameButton"
      onClick={() => {
        setIsContextMenuOpen(false);
        setIsRenameModalOpen(true);
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
        setIsDeleteModalOpen(true);
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
              <h1 id={ariaLabelledBy}>{title}</h1>
            </EuiButtonEmpty>
          }
          isOpen={isContextMenuOpen}
          closePopover={() => setIsContextMenuOpen(false)}
          panelPaddingSize="s"
          anchorPosition="downCenter"
        >
          <EuiContextMenuPanel size="s" items={menuItems} />
        </EuiPopover>
        <DeleteConversationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
        />
        <RenameConversationModal
          isOpen={isRenameModalOpen}
          onClose={() => setIsRenameModalOpen(false)}
        />
      </>
    );
  }

  return null;
};

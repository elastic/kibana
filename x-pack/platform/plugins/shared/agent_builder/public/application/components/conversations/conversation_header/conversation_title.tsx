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
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationTitle, useHasPersistedConversation } from '../../../hooks/use_conversation';
import { DeleteConversationModal } from '../delete_conversation_modal';
import { RenameConversationModal } from '../rename_conversation_modal';

const labels = {
  rename: i18n.translate('xpack.agentBuilder.conversationTitle.rename', {
    defaultMessage: 'Rename',
  }),
  delete: i18n.translate('xpack.agentBuilder.conversationTitle.delete', {
    defaultMessage: 'Delete',
  }),
  newConversation: i18n.translate('xpack.agentBuilder.conversationTitle.newConversation', {
    defaultMessage: 'New conversation',
  }),
  openTitleMenu: i18n.translate('xpack.agentBuilder.conversationTitle.openTitleMenu', {
    defaultMessage: 'Open conversation menu',
  }),
};

interface ConversationTitleProps {
  ariaLabelledBy?: string;
}

export const ConversationTitle: React.FC<ConversationTitleProps> = ({ ariaLabelledBy }) => {
  const { title, isLoading: isLoadingTitle } = useConversationTitle();
  const hasPersistedConversation = useHasPersistedConversation();
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const displayedTitle = isLoadingTitle ? '' : title || labels.newConversation;

  // No popover for unsaved conversations — just show the title
  if (!hasPersistedConversation) {
    return (
      <h4
        id={ariaLabelledBy}
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
        data-test-subj="agentBuilderConversationTitle"
      >
        {displayedTitle}
      </h4>
    );
  }

  const menuItems = [
    <EuiContextMenuItem
      key="rename"
      icon="pencil"
      onClick={() => {
        setIsPopoverOpen(false);
        setIsRenameModalOpen(true);
      }}
      data-test-subj="agentBuilderConversationRenameButton"
    >
      {labels.rename}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon={<EuiIcon type="trash" color="danger" aria-hidden={true} />}
      onClick={() => {
        setIsPopoverOpen(false);
        setIsDeleteModalOpen(true);
      }}
      css={css`
        color: ${euiTheme.colors.danger};
      `}
      data-test-subj="agentBuilderConversationDeleteButton"
    >
      {labels.delete}
    </EuiContextMenuItem>,
  ];

  const titleButtonStyles = css`
    max-width: 100%;
    block-size: auto;
    font-weight: ${euiTheme.font.weight.semiBold};
    .euiButtonEmpty__text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  const titleButton = (
    <EuiButtonEmpty
      color="text"
      iconType="arrowDown"
      iconSide="right"
      flush="left"
      onClick={() => setIsPopoverOpen((open) => !open)}
      aria-expanded={isPopoverOpen}
      css={titleButtonStyles}
      data-test-subj="agentBuilderConversationTitleButton"
    >
      <span id={ariaLabelledBy}>{displayedTitle}</span>
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiPopover
        button={titleButton}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downCenter"
        aria-label={labels.openTitleMenu}
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>

      <RenameConversationModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
      />

      <DeleteConversationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
};

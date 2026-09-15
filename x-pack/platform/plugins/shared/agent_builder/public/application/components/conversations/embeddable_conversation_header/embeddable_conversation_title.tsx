/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import {
  useConversationPermissions,
  useConversationReadOnly,
  useConversationTitle,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
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
  readOnly: i18n.translate('xpack.agentBuilder.embeddableConversationTitle.readOnly', {
    defaultMessage: 'Read-Only',
  }),
};

const titleSlotStyles = css`
  min-width: 0;
`;

const ConversationReadOnlyBadge = () => (
  <EuiBetaBadge
    iconType="lock"
    label={labels.readOnly}
    size="s"
    data-test-subj="agentBuilderEmbeddableConversationReadOnlyBadge"
  />
);

interface EmbeddableConversationTitleProps {
  ariaLabelledBy?: string;
}

export const EmbeddableConversationTitle = ({
  ariaLabelledBy,
}: EmbeddableConversationTitleProps) => {
  const { title, isLoading: isLoadingTitle } = useConversationTitle();
  const hasPersistedConversation = useHasPersistedConversation();
  const { rename: canRename, delete: canDelete } = useConversationPermissions();
  const { isReadOnly } = useConversationReadOnly();
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const displayedTitle = isLoadingTitle ? '' : title || labels.newConversation;

  const menuItems = [
    ...(canRename
      ? [
          <EuiContextMenuItem
            key="rename"
            icon="pencil"
            onClick={() => {
              setIsPopoverOpen(false);
              setIsRenameModalOpen(true);
            }}
            data-test-subj="agentBuilderConversationRenameButton"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.conversation.RENAME,
              detail: 'conversation',
            })}
          >
            {labels.rename}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(canDelete
      ? [
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
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.conversation.DELETE,
              detail: 'conversation',
            })}
          >
            {labels.delete}
          </EuiContextMenuItem>,
        ]
      : []),
  ];

  // Nothing to open the popover for: an unsaved conversation, or one the user may not act on.
  if (!hasPersistedConversation || menuItems.length === 0) {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={true} css={titleSlotStyles}>
          <h4
            id={ariaLabelledBy}
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            data-test-subj="agentBuilderConversationTitle"
          >
            {displayedTitle}
          </h4>
        </EuiFlexItem>
        {isReadOnly && (
          <EuiFlexItem grow={false}>
            <ConversationReadOnlyBadge />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }

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
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={true} css={titleSlotStyles}>
        <EuiButtonEmpty
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          flush="left"
          onClick={() => setIsPopoverOpen((open) => !open)}
          aria-expanded={isPopoverOpen}
          css={titleButtonStyles}
          data-test-subj="agentBuilderConversationTitleButton"
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_TITLE_MENU,
            detail: 'conversation',
          })}
        >
          <span id={ariaLabelledBy}>{displayedTitle}</span>
        </EuiButtonEmpty>
      </EuiFlexItem>
      {isReadOnly && (
        <EuiFlexItem grow={false}>
          <ConversationReadOnlyBadge />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
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

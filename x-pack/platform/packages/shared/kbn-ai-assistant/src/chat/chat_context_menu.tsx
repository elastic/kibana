/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiToolTip,
  EuiHorizontalRule,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConfirmModal } from '../hooks';

export function ChatContextMenu({
  disabled = false,
  isConversationOwnedByCurrentUser,
  conversationTitle,
  onCopyToClipboardClick,
  onCopyUrlClick,
  onDeleteClick,
  onDuplicateConversationClick,
}: {
  disabled?: boolean;
  isConversationOwnedByCurrentUser: boolean;
  conversationTitle: string;
  onCopyToClipboardClick: () => void;
  onCopyUrlClick: () => void;
  onDeleteClick: () => void;
  onDuplicateConversationClick: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { element: confirmDeleteElement, confirm: confirmDeleteCallback } = useConfirmModal({
    title: i18n.translate('xpack.aiAssistant.flyout.confirmDeleteConversationTitle', {
      defaultMessage: 'Delete conversation',
    }),
    children: i18n.translate('xpack.aiAssistant.flyout.confirmDeleteConversationContent', {
      defaultMessage: 'This action is permanent and cannot be undone.',
    }),
    confirmButtonText: i18n.translate('xpack.aiAssistant.flyout.confirmDeleteButtonText', {
      defaultMessage: 'Delete',
    }),
  });

  const menuItems = [
    <EuiContextMenuItem
      key="duplicate"
      icon="copy"
      onClick={() => {
        onDuplicateConversationClick();
        setIsPopoverOpen(false);
      }}
    >
      {i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.duplicateConversation', {
        defaultMessage: 'Duplicate',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="copyConversationToClipboard"
      icon="copyClipboard"
      onClick={() => {
        onCopyToClipboardClick();
        setIsPopoverOpen(false);
      }}
    >
      {i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.copyToClipboard', {
        defaultMessage: 'Copy to clipboard',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="copyURL"
      icon="link"
      onClick={() => {
        onCopyUrlClick();
        setIsPopoverOpen(false);
      }}
    >
      {i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.copyUrl', {
        defaultMessage: 'Copy URL',
      })}
    </EuiContextMenuItem>,
  ];

  if (isConversationOwnedByCurrentUser) {
    menuItems.push(<EuiHorizontalRule key="seperator" margin="none" />);
    menuItems.push(
      <EuiContextMenuItem
        key="delete"
        css={css`
          color: ${euiTheme.colors.danger};
          padding: ${euiTheme.size.s};
        `}
        icon={<EuiIcon type="trash" size="m" color="danger" />}
        onClick={() => {
          confirmDeleteCallback(
            i18n.translate('xpack.aiAssistant.flyout.confirmDeleteCheckboxLabel', {
              defaultMessage: 'Delete "{title}"',
              values: { title: conversationTitle },
            })
          ).then((confirmed) => {
            if (!confirmed) {
              return;
            }
            onDeleteClick();
          });

          setIsPopoverOpen(false);
        }}
      >
        {i18n.translate('xpack.aiAssistant.conversationList.deleteConversationIconLabel', {
          defaultMessage: 'Delete',
        })}
      </EuiContextMenuItem>
    );
  }

  return (
    <>
      <EuiPopover
        button={
          <EuiToolTip
            content={i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.chatActionsTooltip', {
              defaultMessage: 'Conversation actions',
            })}
            display="block"
          >
            <EuiButtonIcon
              data-test-subj="observabilityAiAssistantChatContextMenuButtonIcon"
              iconType="boxesVertical"
              color="text"
              disabled={disabled}
              aria-label={i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.iconAreaLabel', {
                defaultMessage: 'Conversation context menu',
              })}
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="downCenter"
        panelPaddingSize="xs"
      >
        <EuiContextMenuPanel size="s" items={menuItems} />
      </EuiPopover>
      {confirmDeleteElement}
    </>
  );
}

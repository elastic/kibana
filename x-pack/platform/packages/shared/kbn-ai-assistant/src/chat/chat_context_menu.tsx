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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function ChatContextMenu({
  onCopyConversationClick,
  disabled,
}: {
  onCopyConversationClick: () => void;
  disabled: boolean;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiToolTip
          content={i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.chatActionsTooltip', {
            defaultMessage: 'Chat actions',
          })}
          display="block"
        >
          <EuiButtonIcon
            data-test-subj="observabilityAiAssistantChatContextMenuButtonIcon"
            iconType="boxesHorizontal"
            disabled={disabled}
            aria-label={i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.iconAreaLabel', {
              defaultMessage: 'Chat context menu',
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
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key="copyConversation"
            icon="copyClipboard"
            onClick={() => {
              onCopyConversationClick();
              setIsPopoverOpen(false);
            }}
          >
            {i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.copyConversation', {
              defaultMessage: 'Copy conversation',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="copyURL"
            icon="link"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setIsPopoverOpen(false);
            }}
          >
            {i18n.translate('xpack.aiAssistant.chatHeader.contextMenu.copyURL', {
              defaultMessage: 'Copy URL',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}

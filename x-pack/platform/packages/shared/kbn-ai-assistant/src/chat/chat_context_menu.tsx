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

export function ChatContextMenu({
  onCopyToClipboardClick,
  onCopyUrlClick,
  disabled,
}: {
  onCopyToClipboardClick: () => void;
  onCopyUrlClick: () => void;
  disabled: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
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
      <EuiContextMenuPanel
        size="s"
        items={[
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
          <EuiHorizontalRule margin="none" />,
          <EuiContextMenuItem
            key="delete"
            css={css`
              color: ${euiTheme.colors.danger};
              padding: ${euiTheme.size.s};
            `}
            icon={<EuiIcon type="trash" size="m" color="danger" />}
            onClick={() => {
              // onCopyUrlClick();
              setIsPopoverOpen(false);
            }}
          >
            {i18n.translate('xpack.aiAssistant.conversationList.deleteConversationIconLabel', {
              defaultMessage: 'Delete',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}

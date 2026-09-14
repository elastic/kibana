/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPopover, EuiText, EuiToolTip } from '@elastic/eui';

export function ChatItemActions({
  canCopy,
  canEdit,
  collapsed,
  editing,
  expanded,
  onToggleEdit,
  onToggleExpand,
  onCopyToClipboard,
}: {
  canCopy: boolean;
  canEdit: boolean;
  collapsed: boolean;
  editing: boolean;
  expanded: boolean;
  onToggleEdit: () => void;
  onToggleExpand: () => void;
  onCopyToClipboard: () => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<string | undefined>();

  const editPromptLabel = i18n.translate('xpack.aiAssistant.chatTimeline.actions.editPrompt', {
    defaultMessage: 'Edit prompt',
  });

  const inspectPromptLabel = i18n.translate(
    'xpack.aiAssistant.chatTimeline.actions.inspectPrompt',
    { defaultMessage: 'Inspect prompt' }
  );

  const copyMessageLabel = i18n.translate('xpack.aiAssistant.chatTimeline.actions.copyMessage', {
    defaultMessage: 'Copy message',
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isPopoverOpen) {
        setIsPopoverOpen(undefined);
      }
    }, 800);

    return () => {
      clearTimeout(timeout);
    };
  }, [isPopoverOpen]);

  return (
    <>
      {canEdit ? (
        <EuiToolTip content={editPromptLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={editPromptLabel}
            color="text"
            data-test-subj="observabilityAiAssistantChatItemActionsEditPromptButton"
            display={editing ? 'fill' : 'empty'}
            iconType="pencil"
            onClick={onToggleEdit}
          />
        </EuiToolTip>
      ) : null}

      {collapsed ? (
        <EuiToolTip content={inspectPromptLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={inspectPromptLabel}
            color="text"
            data-test-subj="observabilityAiAssistantChatItemActionsInspectPromptButton"
            display={expanded ? 'fill' : 'empty'}
            iconType="inspect"
            onClick={onToggleExpand}
          />
        </EuiToolTip>
      ) : null}

      {canCopy ? (
        <EuiPopover
          aria-label={i18n.translate(
            'xpack.aiAssistant.chatTimeline.actions.copyMessagePopoverAriaLabel',
            { defaultMessage: 'Copy message confirmation' }
          )}
          button={
            <EuiToolTip content={copyMessageLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={copyMessageLabel}
                color="text"
                data-test-subj="observabilityAiAssistantChatItemActionsCopyMessageButton"
                iconType="copy"
                display={isPopoverOpen === 'copy' ? 'fill' : 'empty'}
                onClick={() => {
                  setIsPopoverOpen('copy');
                  onCopyToClipboard();
                }}
              />
            </EuiToolTip>
          }
          isOpen={isPopoverOpen === 'copy'}
          panelPaddingSize="s"
          closePopover={() => setIsPopoverOpen(undefined)}
        >
          <EuiText size="s">
            {i18n.translate('xpack.aiAssistant.chatTimeline.actions.copyMessageSuccessful', {
              defaultMessage: 'Copied message',
            })}
          </EuiText>
        </EuiPopover>
      ) : null}
    </>
  );
}

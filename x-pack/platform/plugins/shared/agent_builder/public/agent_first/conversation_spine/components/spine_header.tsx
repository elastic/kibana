/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { headerHeight } from '../../../application/components/conversations/conversation.styles';
import { useConversationContext } from '../../../application/context/conversation/conversation_context';
import { useConversationId } from '../../../application/context/conversation/use_conversation_id';
import {
  useConversationTitle,
  useHasPersistedConversation,
} from '../../../application/hooks/use_conversation';
import { useToasts } from '../../../application/hooks/use_toasts';
import type { SpineHeaderSlots } from '../types';

const labels = {
  close: i18n.translate('xpack.agentBuilder.conversationSpine.header.close', {
    defaultMessage: 'Close',
  }),
  fullscreen: i18n.translate('xpack.agentBuilder.conversationSpine.header.fullscreen', {
    defaultMessage: 'Toggle fullscreen',
  }),
  newConversation: i18n.translate('xpack.agentBuilder.conversationSpine.header.newConversation', {
    defaultMessage: 'New conversation',
  }),
  renameErrorToast: i18n.translate('xpack.agentBuilder.conversationSpine.header.renameError', {
    defaultMessage: 'Failed to rename conversation',
  }),
  titleAriaLabel: i18n.translate('xpack.agentBuilder.conversationSpine.header.titleAriaLabel', {
    defaultMessage: 'Conversation title',
  }),
};

interface SpineHeaderProps {
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  headerSlots?: SpineHeaderSlots;
}

export const SpineHeader: React.FC<SpineHeaderProps> = ({
  onClose,
  isFullscreen,
  onToggleFullscreen,
  headerSlots,
}) => {
  const { euiTheme } = useEuiTheme();
  const conversationId = useConversationId();
  const { title, isLoading: isLoadingTitle } = useConversationTitle();
  const hasPersistedConversation = useHasPersistedConversation();
  const { conversationActions } = useConversationContext();
  const { addErrorToast } = useToasts();

  const displayedTitle = isLoadingTitle ? '' : title || labels.newConversation;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayedTitle);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(displayedTitle);
    }
  }, [displayedTitle, isEditing]);

  const headerShellStyles = css`
    flex-shrink: 0;
    box-sizing: border-box;
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    background: ${euiTheme.colors.backgroundBasePlain};
    padding-inline: ${euiTheme.size.m};
    min-height: calc(${headerHeight}px - ${euiTheme.border.width.thin});
  `;

  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.font.scale.m}${euiTheme.font.defaultUnits};
    min-width: 0;
  `;

  const commitRename = useCallback(async () => {
    const trimmed = editValue.trim();
    setIsEditing(false);

    if (!conversationId || !hasPersistedConversation || !trimmed || trimmed === displayedTitle) {
      setEditValue(displayedTitle);
      return;
    }

    try {
      await conversationActions.renameConversation(conversationId, trimmed);
    } catch (error: unknown) {
      setEditValue(displayedTitle);
      addErrorToast({
        title: labels.renameErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
    }
  }, [
    conversationActions,
    conversationId,
    displayedTitle,
    editValue,
    hasPersistedConversation,
    addErrorToast,
  ]);

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        void commitRename();
      }
      if (event.key === 'Escape') {
        setEditValue(displayedTitle);
        setIsEditing(false);
      }
    },
    [commitRename, displayedTitle]
  );

  const titleContent =
    hasPersistedConversation && isEditing ? (
      <EuiFieldText
        aria-label={labels.titleAriaLabel}
        value={editValue}
        onChange={(event) => setEditValue(event.target.value)}
        onBlur={() => void commitRename()}
        onKeyDown={handleTitleKeyDown}
        compressed
        fullWidth
        data-test-subj="agentBuilderConversationSpineTitleInput"
      />
    ) : (
      <button
        type="button"
        css={css`
          ${titleStyles}
          background: none;
          border: none;
          padding: 0;
          text-align: left;
          cursor: ${hasPersistedConversation ? 'text' : 'default'};
          color: inherit;
          width: 100%;
        `}
        onClick={() => {
          if (hasPersistedConversation) {
            setIsEditing(true);
          }
        }}
        data-test-subj="agentBuilderConversationSpineTitle"
      >
        {displayedTitle}
      </button>
    );

  return (
    <div css={headerShellStyles}>
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        style={{ minHeight: `calc(${headerHeight}px - ${euiTheme.border.width.thin})` }}
      >
        <EuiFlexItem grow css={titleStyles}>
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            {headerSlots?.beforeTitle ? (
              <EuiFlexItem grow={false}>{headerSlots.beforeTitle}</EuiFlexItem>
            ) : null}
            <EuiFlexItem grow style={{ minWidth: 0 }}>{titleContent}</EuiFlexItem>
            {headerSlots?.afterTitle ? (
              <EuiFlexItem grow={false}>{headerSlots.afterTitle}</EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiToolTip content={labels.fullscreen} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={isFullscreen ? 'fullScreenExit' : 'fullScreen'}
                  aria-label={labels.fullscreen}
                  color="text"
                  size="s"
                  onClick={onToggleFullscreen}
                  data-test-subj="agentBuilderConversationSpineFullscreen"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={labels.close} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label={labels.close}
                  color="text"
                  size="s"
                  onClick={onClose}
                  data-test-subj="agentBuilderConversationSpineClose"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

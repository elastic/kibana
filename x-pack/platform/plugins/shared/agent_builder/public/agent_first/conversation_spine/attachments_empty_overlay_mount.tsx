/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { headerHeight } from '../../application/components/conversations/conversation.styles';
import { ConversationTitle } from '../../application/components/conversations/conversation_header/conversation_title';
import { useIsAgentWorkspaceMount } from '../../application/hooks/use_navigation';
import { AgentCartPushFlyout } from './agent_cart_push_flyout';
import { useOptionalConversationSpineContext } from './conversation_spine_context';
import { useEscapeKeyHandler } from './hooks/use_escape_key_handler';

const labels = {
  close: i18n.translate('xpack.agentBuilder.conversationSpine.attachmentsEmptyOverlay.close', {
    defaultMessage: 'Close',
  }),
  body: i18n.translate('xpack.agentBuilder.conversationSpine.attachmentsEmptyOverlay.body', {
    defaultMessage:
      'No pinned items yet. Open an app and click the pin button to add content to this conversation.',
  }),
  ariaLabel: i18n.translate(
    'xpack.agentBuilder.conversationSpine.attachmentsEmptyOverlay.ariaLabel',
    {
      defaultMessage: 'Empty attachment cart',
    }
  ),
};

export const AttachmentsEmptyOverlayMount: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const spineContext = useOptionalConversationSpineContext();
  const hasAttachments = spineContext?.hasAttachments ?? false;
  const isAttachmentsEmptyOpen = spineContext?.isAttachmentsEmptyOpen ?? false;
  const isCartFlyoutReady = spineContext?.isCartFlyoutReady ?? true;
  const closeAttachmentsEmptyOverlay =
    spineContext?.closeAttachmentsEmptyOverlay ?? (() => undefined);

  const isOverlayOpen =
    isAgentWorkspaceMount && isAttachmentsEmptyOpen && !hasAttachments && isCartFlyoutReady;

  const onEscape = useCallback(() => {
    closeAttachmentsEmptyOverlay();
  }, [closeAttachmentsEmptyOverlay]);

  useEscapeKeyHandler(onEscape, isAgentWorkspaceMount && isAttachmentsEmptyOpen && !hasAttachments);

  if (!isOverlayOpen) {
    return null;
  }

  const headerStyles = css`
    flex-shrink: 0;
    box-sizing: border-box;
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    background: ${euiTheme.colors.backgroundBasePlain};
    padding-inline: ${euiTheme.size.m};
    min-height: calc(${headerHeight}px - ${euiTheme.border.width.thin});
  `;

  const contentStyles = css`
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  return (
    <AgentCartPushFlyout
      isOpen={true}
      onClose={() => closeAttachmentsEmptyOverlay()}
      ariaLabel={labels.ariaLabel}
      data-test-subj="agentBuilderAttachmentsEmptyOverlay"
    >
      <div css={headerStyles}>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
          style={{ minHeight: `calc(${headerHeight}px - ${euiTheme.border.width.thin})` }}
        >
          <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
            <ConversationTitle
              showBadge={false}
              showSidebarTrigger={false}
              showTitleMenu={false}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={labels.close} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                aria-label={labels.close}
                color="text"
                size="s"
                onClick={() => closeAttachmentsEmptyOverlay()}
                data-test-subj="agentBuilderAttachmentsEmptyOverlayClose"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={contentStyles}>
        <EuiEmptyPrompt icon={<EuiIcon type="paperClip" size="xl" />} body={labels.body} />
      </div>
    </AgentCartPushFlyout>
  );
};

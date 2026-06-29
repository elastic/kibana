/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useReducer } from 'react';
import { createPortal } from 'react-dom';
import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getApplicationWorkspaceMountElement } from '../../agent_workspace/agent_workspace_flyout_defaults';
import { applicationWorkspaceFixedOverlayStyles } from '../../agent_workspace/application_workspace_fixed_overlay_styles';
import { headerHeight } from '../../application/components/conversations/conversation.styles';
import { useIsAgentWorkspaceMount } from '../../application/hooks/use_navigation';
import { useOptionalConversationSpineContext } from './conversation_spine_context';
import { useEscapeKeyHandler } from './hooks/use_escape_key_handler';

const overlayEntrance = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const labels = {
  close: i18n.translate('xpack.agentBuilder.conversationSpine.attachmentsEmptyOverlay.close', {
    defaultMessage: 'Close',
  }),
  body: i18n.translate('xpack.agentBuilder.conversationSpine.attachmentsEmptyOverlay.body', {
    defaultMessage:
      'No pinned items yet. Open an app and click the pin button to add content to this conversation.',
  }),
};

export const AttachmentsEmptyOverlayMount: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const spineContext = useOptionalConversationSpineContext();
  const hasAttachments = spineContext?.hasAttachments ?? false;
  const isAttachmentsEmptyOpen = spineContext?.isAttachmentsEmptyOpen ?? false;
  const closeAttachmentsEmptyOverlay =
    spineContext?.closeAttachmentsEmptyOverlay ?? (() => undefined);
  const [, retryMount] = useReducer((count) => count + 1, 0);

  const isOverlayOpen = isAgentWorkspaceMount && isAttachmentsEmptyOpen && !hasAttachments;

  const onEscape = useCallback(() => {
    closeAttachmentsEmptyOverlay();
  }, [closeAttachmentsEmptyOverlay]);

  useEscapeKeyHandler(onEscape, isOverlayOpen);

  useEffect(() => {
    if (!isAgentWorkspaceMount || !isAttachmentsEmptyOpen || hasAttachments) {
      return;
    }

    if (getApplicationWorkspaceMountElement()) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      retryMount();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [hasAttachments, isAgentWorkspaceMount, isAttachmentsEmptyOpen]);

  if (!isAgentWorkspaceMount || !isAttachmentsEmptyOpen || hasAttachments) {
    return null;
  }

  const mountElement = getApplicationWorkspaceMountElement();
  if (!mountElement) {
    return null;
  }

  const overlayStyles = css`
    ${applicationWorkspaceFixedOverlayStyles};
    background: ${euiTheme.colors.backgroundBasePlain};
    animation: ${overlayEntrance} 200ms ease-out;
  `;

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

  return createPortal(
    <div css={overlayStyles} data-test-subj="agentBuilderAttachmentsEmptyOverlay">
      <div css={headerStyles}>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="flexEnd"
          style={{ minHeight: `calc(${headerHeight}px - ${euiTheme.border.width.thin})` }}
        >
          <EuiFlexItem grow={false}>
            <EuiToolTip content={labels.close} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                aria-label={labels.close}
                color="text"
                size="s"
                onClick={closeAttachmentsEmptyOverlay}
                data-test-subj="agentBuilderAttachmentsEmptyOverlayClose"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={contentStyles}>
        <EuiEmptyPrompt
          icon={<EuiIcon type="paperClip" size="xl" />}
          body={labels.body}
        />
      </div>
    </div>,
    mountElement
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlyout, EuiFlyoutBody, useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_MAIN_CONTAINER_ID } from '@kbn/ui-chrome-layout';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { useAgentId } from '../../../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { useIsAgentWorkspaceMount } from '../../../../../hooks/use_navigation';
import {
  agentPanelFlyoutStyles,
  useAgentPanelWidth,
  useClearAgentPanelPushOffsetOnUnmount,
} from '../../../../../hooks/use_agent_panel_width';
import { AttachmentHeader } from './attachment_header';
import { AttachmentRenderErrorBoundary } from './attachment_render_error_boundary';
import { useCanvasContext } from './canvas_context';

const DEFAULT_CANVAS_WIDTH = '50vw';
const AGENT_CANVAS_DEFAULT_WIDTH = '600px';
const CANVAS_MIN_WIDTH = 300;
/** Push canvas in the agent column when it is wide enough for chat + a ~600px editor. */
const CANVAS_PUSH_MIN_AGENT_WIDTH = 1400;

const FLYOUT_ARIA_LABEL = i18n.translate('xpack.agentBuilder.canvasFlyout.ariaLabel', {
  defaultMessage: 'Attachment preview',
});

interface CanvasFlyoutProps {
  attachmentsService: AttachmentsService;
}

/**
 * Flyout for expanded attachment preview.
 * In agent-first chrome it stays in the agent column: overlay below 1400px, push when wider.
 * Full-screen Agent Builder still uses a 50vw push flyout (overlay on narrow viewports).
 */
export const CanvasFlyout: React.FC<CanvasFlyoutProps> = ({ attachmentsService }) => {
  const { euiTheme } = useEuiTheme();
  const { canvasState, closeCanvas, setCanvasAttachmentOrigin } = useCanvasContext();
  const conversationId = useConversationId();
  const { conversationActions } = useConversationContext();
  const agentId = useAgentId();
  const { openSidebarConversation: openSidebarConversationInternal } = useAgentBuilderServices();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const agentPanelWidth = useAgentPanelWidth(isAgentWorkspaceMount);
  const isNarrowViewport = useIsWithinBreakpoints(['xs', 's', 'm']);
  useClearAgentPanelPushOffsetOnUnmount(isAgentWorkspaceMount && canvasState != null);

  const openSidebarConversation = useCallback(() => {
    openSidebarConversationInternal({ conversationId });
  }, [conversationId, openSidebarConversationInternal]);

  // Track previous conversation ID to detect changes
  const prevConversationIdRef = useRef(conversationId);

  // Close canvas when conversation ID changes
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      closeCanvas();
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId, closeCanvas]);

  const updateOrigin = useCallback(
    async (origin: string) => {
      if (!conversationId || !canvasState) {
        return;
      }
      const result = await attachmentsService.updateOrigin(
        conversationId,
        canvasState.attachment.id,
        origin
      );
      setCanvasAttachmentOrigin(origin);
      conversationActions.invalidateConversation();
      return result;
    },
    [
      attachmentsService,
      conversationId,
      canvasState,
      setCanvasAttachmentOrigin,
      conversationActions,
    ]
  );

  const uiDefinition = canvasState
    ? attachmentsService.getAttachmentUiDefinition(canvasState.attachment.type)
    : null;

  const [dynamicButtons, setDynamicButtons] = useState<ActionButton[]>([]);

  // Clear dynamic buttons when the canvas attachment changes
  useEffect(() => {
    setDynamicButtons([]);
  }, [canvasState?.attachment.id, canvasState?.attachment.versionData?.version]);

  const registerActionButtons = useCallback((buttons: ActionButton[]) => {
    setDynamicButtons(buttons);
  }, []);

  const canvasHeaderActionButtons = useMemo(() => {
    if (!canvasState) {
      return dynamicButtons;
    }
    const staticButtons =
      uiDefinition?.getActionButtons?.({
        attachment: canvasState.attachment,
        isSidebar: canvasState.isSidebar,
        agentId,
        updateOrigin,
        openSidebarConversation: canvasState.isSidebar ? undefined : openSidebarConversation,
        isCanvas: true,
        closeCanvas,
      }) ?? [];
    return [...staticButtons, ...dynamicButtons];
  }, [
    canvasState,
    uiDefinition,
    agentId,
    updateOrigin,
    openSidebarConversation,
    dynamicButtons,
    closeCanvas,
  ]);

  if (!canvasState || !uiDefinition?.renderCanvasContent) {
    return null;
  }

  const { attachment, isSidebar } = canvasState;
  const { renderCanvasContent } = uiDefinition;
  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type.toUpperCase();
  const header = uiDefinition?.getHeader?.({ attachment });

  const isAgentCanvasPush =
    isAgentWorkspaceMount && agentPanelWidth >= CANVAS_PUSH_MIN_AGENT_WIDTH;
  const isOverlayCanvas = isAgentWorkspaceMount
    ? !isAgentCanvasPush
    : isSidebar || isNarrowViewport;
  const flyoutType = isOverlayCanvas ? 'overlay' : 'push';
  const width = isAgentWorkspaceMount
    ? uiDefinition.canvasWidth ?? AGENT_CANVAS_DEFAULT_WIDTH
    : uiDefinition.canvasWidth ?? DEFAULT_CANVAS_WIDTH;
  const flyoutSize = isOverlayCanvas ? 'full' : width;

  const flyoutBodyStyles = css`
    padding-top: ${euiTheme.size.m};

    > .euiFlyoutBody__overflow {
      mask-image: none;
    }

    .euiFlyoutBody__overflowContent {
      height: 100%;
    }
  `;

  return (
    <EuiFlyout
      onClose={closeCanvas}
      aria-label={FLYOUT_ARIA_LABEL}
      ownFocus={false}
      outsideClickCloses={!isAgentWorkspaceMount || isOverlayCanvas}
      minWidth={CANVAS_MIN_WIDTH}
      maxWidth={isAgentWorkspaceMount ? undefined : DEFAULT_CANVAS_WIDTH}
      resizable={!isOverlayCanvas}
      size={flyoutSize}
      type={flyoutType}
      session={isAgentWorkspaceMount ? 'never' : undefined}
      hasAnimation={!isAgentWorkspaceMount}
      container={isAgentWorkspaceMount ? `#${AGENT_MAIN_CONTAINER_ID}` : undefined}
      hideCloseButton
      paddingSize="none"
      css={isAgentWorkspaceMount ? agentPanelFlyoutStyles : undefined}
    >
      <AttachmentHeader
        icon={header?.icon}
        title={title}
        subtitle={header?.subtitle}
        badges={header?.badges}
        actionButtons={canvasHeaderActionButtons}
        onClose={closeCanvas}
        previewBadgeState="preview_available"
        isCanvas
      />
      <EuiFlyoutBody css={flyoutBodyStyles}>
        <AttachmentRenderErrorBoundary
          key={`${attachment.id}:${attachment.versionData?.version ?? 'latest'}`}
        >
          {() =>
            renderCanvasContent(
              {
                attachment,
                isSidebar,
                openSidebarConversation: isSidebar ? undefined : openSidebarConversation,
              },
              {
                registerActionButtons,
                updateOrigin,
                closeCanvas,
              }
            )
          }
        </AttachmentRenderErrorBoundary>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

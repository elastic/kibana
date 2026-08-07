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
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { useAgentId } from '../../../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { AttachmentHeader } from './attachment_header';
import { AttachmentRenderErrorBoundary } from './attachment_render_error_boundary';
import { useCanvasContext } from './canvas_context';

const DEFAULT_CANVAS_WIDTH = '50vw';
const CANVAS_MIN_WIDTH = 300;

const FLYOUT_ARIA_LABEL = i18n.translate('xpack.agentBuilder.canvasFlyout.ariaLabel', {
  defaultMessage: 'Attachment preview',
});

interface CanvasFlyoutProps {
  attachmentsService: AttachmentsService;
}

/**
 * Flyout component for displaying attachments in canvas mode (expanded view).
 * Consumes canvas state from context. In full-screen context, renders at 50% screen width.
 * In sidebar context, uses default flyout width.
 */
export const CanvasFlyout: React.FC<CanvasFlyoutProps> = ({ attachmentsService }) => {
  const { euiTheme } = useEuiTheme();
  const { canvasState, closeCanvas, setCanvasAttachmentOrigin } = useCanvasContext();
  const conversationId = useConversationId();
  const { conversationActions } = useConversationContext();
  const agentId = useAgentId();
  const { openSidebarConversation: openSidebarConversationInternal } = useAgentBuilderServices();
  const isNarrowViewport = useIsWithinBreakpoints(['xs', 's', 'm']);

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

  const flyoutType = isSidebar || isNarrowViewport ? 'overlay' : 'push';
  const width = uiDefinition.canvasWidth ?? DEFAULT_CANVAS_WIDTH;
  const flyoutSize = isSidebar || isNarrowViewport ? 'full' : width;

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
      outsideClickCloses={true}
      minWidth={CANVAS_MIN_WIDTH}
      maxWidth={DEFAULT_CANVAS_WIDTH}
      resizable={!isSidebar && !isNarrowViewport}
      size={flyoutSize}
      type={flyoutType}
      hideCloseButton
      paddingSize="none"
    >
      <AttachmentHeader
        icon={header?.icon}
        title={title}
        subtitle={header?.subtitle}
        badges={header?.badges}
        actionButtons={canvasHeaderActionButtons}
        onClose={closeCanvas}
        previewBadgeState="preview_available"
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlyout, EuiFlyoutBody, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { AttachmentHeader } from './attachment_header';
import { useCanvasContext } from './canvas_context';

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
    async (origin: unknown) => {
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
  }, [canvasState?.attachment.id]);

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
        updateOrigin,
        isCanvas: true,
      }) ?? [];
    return [...staticButtons, ...dynamicButtons];
  }, [canvasState, uiDefinition, updateOrigin, dynamicButtons]);

  if (!canvasState || !uiDefinition?.renderCanvasContent) {
    return null;
  }

  const { attachment, isSidebar } = canvasState;
  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type.toUpperCase();

  const flyoutStyles = !isSidebar
    ? css`
        width: 50vw;
      `
    : undefined;

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
      css={flyoutStyles}
      type={isSidebar ? 'overlay' : 'push'}
      hideCloseButton
      paddingSize="none"
    >
      <AttachmentHeader
        title={title}
        actionButtons={canvasHeaderActionButtons}
        onClose={closeCanvas}
        showPreviewBadge
      />
      <EuiFlyoutBody css={flyoutBodyStyles}>
        {uiDefinition.renderCanvasContent(
          { attachment, isSidebar },
          { registerActionButtons, updateOrigin, closeCanvas }
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

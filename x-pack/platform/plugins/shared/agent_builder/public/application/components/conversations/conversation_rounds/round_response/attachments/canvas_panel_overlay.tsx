/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { AGENT_WORKSPACE_MOUNT_TEST_SUBJ } from '../../../../../../agent_workspace/agent_workspace_flyout_defaults';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { useAgentId } from '../../../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { shouldOfferSidebarConversation } from '../../../../../hooks/use_navigation';
import { AttachmentHeader } from './attachment_header';
import { useCanvasContext } from './canvas_context';

const ENTRY_DURATION_MS = 250;
const EXIT_DURATION_MS = 150;
const ENTRY_TRANSLATE_Y_PX = 14;

interface CanvasPanelOverlayProps {
  attachmentsService: AttachmentsService;
}

/**
 * Full-column attachment preview for the agent workspace chrome column (POC).
 * Portals into agentWorkspaceMount — not a flyout, no scrim.
 */
export const CanvasPanelOverlay: React.FC<CanvasPanelOverlayProps> = ({ attachmentsService }) => {
  const { euiTheme } = useEuiTheme();
  const { canvasState, closeCanvas, setCanvasAttachmentOrigin } = useCanvasContext();
  const conversationId = useConversationId();
  const { conversationActions } = useConversationContext();
  const agentId = useAgentId();
  const { openSidebarConversation: openSidebarConversationInternal } = useAgentBuilderServices();

  const offerSidebarConversation = shouldOfferSidebarConversation(
    canvasState?.isSidebar ?? false,
    true
  );

  const openSidebarConversation = useCallback(() => {
    openSidebarConversationInternal({ conversationId });
  }, [conversationId, openSidebarConversationInternal]);

  const prevConversationIdRef = useRef(conversationId);
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
  const [mountElement, setMountElement] = useState<HTMLElement | null>(null);
  const [isEntering, setIsEntering] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const mountRoot = document.querySelector(`[data-test-subj="${AGENT_WORKSPACE_MOUNT_TEST_SUBJ}"]`);
    setMountElement(mountRoot instanceof HTMLElement ? mountRoot : null);
  }, []);

  useEffect(() => {
    setDynamicButtons([]);
    setIsClosing(false);
    setIsEntering(true);
    requestAnimationFrame(() => {
      setIsEntering(false);
    });
  }, [canvasState?.attachment.id, canvasState?.attachment.version]);

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
        openSidebarConversation: offerSidebarConversation ? openSidebarConversation : undefined,
        isCanvas: true,
      }) ?? [];
    return [...staticButtons, ...dynamicButtons];
  }, [
    canvasState,
    uiDefinition,
    agentId,
    updateOrigin,
    offerSidebarConversation,
    openSidebarConversation,
    dynamicButtons,
  ]);

  const finishClose = useCallback(() => {
    setIsClosing(false);
    closeCanvas();
  }, [closeCanvas]);

  const handleClose = useCallback(() => {
    if (isClosing) {
      return;
    }
    setIsClosing(true);
  }, [isClosing]);

  useEffect(() => {
    if (!isClosing) {
      return;
    }

    const node = overlayRef.current;
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'opacity') {
        finishClose();
      }
    };

    if (node) {
      node.addEventListener('transitionend', onTransitionEnd);
    }

    const fallbackTimer = window.setTimeout(finishClose, EXIT_DURATION_MS);

    return () => {
      if (node) {
        node.removeEventListener('transitionend', onTransitionEnd);
      }
      window.clearTimeout(fallbackTimer);
    };
  }, [isClosing, finishClose]);

  if (!canvasState || !uiDefinition?.renderCanvasContent || !mountElement) {
    return null;
  }

  const { attachment, isSidebar } = canvasState;
  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type.toUpperCase();
  const header = uiDefinition?.getHeader?.({ attachment });

  const isVisible = !isEntering && !isClosing;

  const overlayTransition = isEntering
    ? 'none'
    : isClosing
      ? `opacity ${EXIT_DURATION_MS}ms ease-in`
      : `opacity ${ENTRY_DURATION_MS}ms ease-out, transform ${ENTRY_DURATION_MS}ms ease-out`;

  const overlayStyles = css`
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: ${euiTheme.colors.backgroundBasePlain};
    opacity: ${isVisible ? 1 : 0};
    transform: translateY(${isEntering ? `${ENTRY_TRANSLATE_Y_PX}px` : '0'});
    transition: ${overlayTransition};
  `;

  const bodyStyles = css`
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding-top: ${euiTheme.size.m};
  `;

  return createPortal(
    <div
      ref={overlayRef}
      css={overlayStyles}
      data-test-subj="agentWorkspaceCanvasOverlay"
    >
      <AttachmentHeader
        icon={header?.icon}
        title={title}
        subtitle={header?.subtitle}
        badges={header?.badges}
        actionButtons={canvasHeaderActionButtons}
        onClose={handleClose}
        previewBadgeState="preview_available"
      />
      <div css={bodyStyles}>
        <React.Fragment key={`${attachment.id}:${attachment.version ?? 'latest'}`}>
          {uiDefinition.renderCanvasContent(
            {
              attachment,
              isSidebar,
              openSidebarConversation: offerSidebarConversation ? openSidebarConversation : undefined,
            },
            {
              registerActionButtons,
              updateOrigin,
              closeCanvas,
            }
          )}
        </React.Fragment>
      </div>
    </div>,
    mountElement
  );
};

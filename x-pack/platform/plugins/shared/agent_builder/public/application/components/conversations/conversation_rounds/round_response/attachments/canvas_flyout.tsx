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
import {
  shouldOfferSidebarConversation,
  useIsAgentWorkspaceMount,
} from '../../../../../hooks/use_navigation';
import { AttachmentHeader } from './attachment_header';
import { AttachmentCartPanel } from './attachment_cart_panel';
import { useCanvasContext } from './canvas_context';

const DEFAULT_CANVAS_WIDTH = '50vw';
const CANVAS_MIN_WIDTH = 300;

const FLYOUT_ARIA_LABEL = i18n.translate('xpack.agentBuilder.canvasFlyout.ariaLabel', {
  defaultMessage: 'Attachment preview',
});

const CART_FLYOUT_ARIA_LABEL = i18n.translate('xpack.agentBuilder.canvasFlyout.cartAriaLabel', {
  defaultMessage: 'Attachment cart',
});

interface CanvasFlyoutProps {
  attachmentsService: AttachmentsService;
}

/**
 * Flyout component for displaying attachments in canvas mode (expanded view).
 * In agent-first chrome, renders a full-width overlay in the application workspace column.
 */
export const CanvasFlyout: React.FC<CanvasFlyoutProps> = ({ attachmentsService }) => {
  const { euiTheme } = useEuiTheme();
  const { canvasState, closeCanvas, setCanvasAttachmentOrigin } = useCanvasContext();
  const conversationId = useConversationId();
  const { conversationActions } = useConversationContext();
  const agentId = useAgentId();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const { openSidebarConversation: openSidebarConversationInternal } = useAgentBuilderServices();
  const isNarrowViewport = useIsWithinBreakpoints(['xs', 's', 'm']);

  const offerSidebarConversation = shouldOfferSidebarConversation(
    canvasState?.isSidebar ?? false,
    isAgentWorkspaceMount
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
      if (!conversationId || !canvasState || canvasState.mode !== 'attachment') {
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

  const uiDefinition =
    canvasState?.mode === 'attachment'
      ? attachmentsService.getAttachmentUiDefinition(canvasState.attachment.type)
      : null;

  const [dynamicButtons, setDynamicButtons] = useState<ActionButton[]>([]);

  useEffect(() => {
    setDynamicButtons([]);
  }, [
    canvasState?.mode === 'attachment' ? canvasState.attachment.id : undefined,
    canvasState?.mode === 'attachment' ? canvasState.attachment.version : undefined,
  ]);

  const registerActionButtons = useCallback((buttons: ActionButton[]) => {
    setDynamicButtons(buttons);
  }, []);

  const canvasHeaderActionButtons = useMemo(() => {
    if (!canvasState) {
      return dynamicButtons;
    }
    const staticButtons =
      canvasState.mode === 'attachment'
        ? uiDefinition?.getActionButtons?.({
            attachment: canvasState.attachment,
            isSidebar: canvasState.isSidebar,
            agentId,
            updateOrigin,
            openSidebarConversation: offerSidebarConversation ? openSidebarConversation : undefined,
            isCanvas: true,
          }) ?? []
        : [];
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

  const useApplicationWorkspaceOverlay =
    isAgentWorkspaceMount && canvasState && !canvasState.isSidebar;

  // Agent-first: conversation spine is portaled via ConversationSpineMount.
  if (useApplicationWorkspaceOverlay) {
    return null;
  }

  const flyoutBodyStyles = css`
    padding-top: ${euiTheme.size.m};

    > .euiFlyoutBody__overflow {
      mask-image: none;
    }

    .euiFlyoutBody__overflowContent {
      height: 100%;
    }
  `;

  if (canvasState?.mode === 'cart') {
    const { isSidebar } = canvasState;
    const flyoutType = isSidebar || isNarrowViewport ? 'overlay' : 'push';
    const flyoutSize = isSidebar || isNarrowViewport ? 'full' : DEFAULT_CANVAS_WIDTH;

    return (
      <EuiFlyout
        onClose={closeCanvas}
        aria-label={CART_FLYOUT_ARIA_LABEL}
        ownFocus={false}
        outsideClickCloses={true}
        minWidth={CANVAS_MIN_WIDTH}
        maxWidth={DEFAULT_CANVAS_WIDTH}
        resizable={!isSidebar && !isNarrowViewport}
        size={flyoutSize}
        type={flyoutType}
        hideCloseButton
        paddingSize="none"
        data-test-subj="agentBuilderAttachmentCartFlyout"
      >
        <AttachmentCartPanel onClose={closeCanvas} />
      </EuiFlyout>
    );
  }

  if (!canvasState || canvasState.mode !== 'attachment' || !uiDefinition?.renderCanvasContent) {
    return null;
  }

  const { attachment, isSidebar } = canvasState;
  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type.toUpperCase();
  const header = uiDefinition?.getHeader?.({ attachment });
  const headerIcon = header?.icon ?? uiDefinition?.getIcon?.();

  const flyoutType = isSidebar || isNarrowViewport ? 'overlay' : 'push';
  const width = uiDefinition.canvasWidth ?? DEFAULT_CANVAS_WIDTH;
  const flyoutSize = isSidebar || isNarrowViewport ? 'full' : width;

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
        icon={headerIcon}
        title={title}
        subtitle={header?.subtitle}
        badges={header?.badges}
        actionButtons={canvasHeaderActionButtons}
        onClose={closeCanvas}
        previewBadgeState="preview_available"
      />
      <EuiFlyoutBody css={flyoutBodyStyles}>
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
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

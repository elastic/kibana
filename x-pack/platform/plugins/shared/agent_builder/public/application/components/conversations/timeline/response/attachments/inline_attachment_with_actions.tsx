/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  UnknownAttachment,
  ScreenContextAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import type { ActionButton, AttachmentPreviewState } from '@kbn/agent-builder-browser/attachments';
import { EuiSplitPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttachmentsService } from '../../../../../../services';
import { AB_PANEL_RADIUS } from '../../../../../../common.styles';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { useAgentId, useConversationReadOnly } from '../../../../../hooks/use_conversation';
import { useConversationStream } from '../../../../../hooks/use_conversation_stream';
import { useIsAwaitingPrompt } from '../../../../../hooks/use_is_awaiting_prompt';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { AttachmentHeader } from './attachment_header';
import { TimelineRenderErrorBoundary } from '../../timeline_render_error_boundary';
import { getAttachmentPreviewKey, useCanvasContext } from './canvas_context';

interface InlineAttachmentWithActionsProps {
  attachment: UnknownAttachment;
  attachmentsService: AttachmentsService;
  isSidebar: boolean;
  conversationId: string;
  screenContext?: ScreenContextAttachmentData;
  /**
   * Shared preview state for header actions/badges.
   */
  previewBadgeState?: AttachmentPreviewState;
}

const areInlineAttachmentPropsEqual = (
  prevProps: InlineAttachmentWithActionsProps,
  nextProps: InlineAttachmentWithActionsProps
): boolean =>
  prevProps.attachment.id === nextProps.attachment.id &&
  prevProps.attachment.type === nextProps.attachment.type &&
  prevProps.attachment.hidden === nextProps.attachment.hidden &&
  prevProps.attachment.origin === nextProps.attachment.origin &&
  prevProps.attachmentsService === nextProps.attachmentsService &&
  prevProps.conversationId === nextProps.conversationId &&
  prevProps.isSidebar === nextProps.isSidebar &&
  prevProps.previewBadgeState === nextProps.previewBadgeState &&
  prevProps.screenContext === nextProps.screenContext &&
  prevProps.attachment.versionData?.version === nextProps.attachment.versionData?.version &&
  prevProps.attachment.versionData?.versionCount === nextProps.attachment.versionData?.versionCount;

/**
 * Component that renders an inline attachment with its action buttons.
 */
const InlineAttachmentWithActionsComponent: React.FC<InlineAttachmentWithActionsProps> = ({
  attachment,
  attachmentsService,
  isSidebar,
  conversationId,
  screenContext,
  previewBadgeState,
}) => {
  const {
    openCanvas: openCanvasContext,
    closeCanvas,
    previewedAttachmentKey,
    setPreviewedAttachmentKey,
  } = useCanvasContext();
  const { conversationActions, conversationId: activeConversationId } = useConversationContext();
  const agentId = useAgentId();
  const { sendMessage, isStreaming } = useConversationStream();
  const { isReadOnly, isLoading: isReadOnlyLoading } = useConversationReadOnly();
  const isAwaitingPrompt = useIsAwaitingPrompt();
  const sending = useRef(false);
  useEffect(() => {
    sending.current = false;
  }, [isStreaming, conversationId]);
  const canSendMessage =
    Boolean(agentId) &&
    activeConversationId === conversationId &&
    !isStreaming &&
    !isReadOnly &&
    !isReadOnlyLoading &&
    !isAwaitingPrompt;
  const sendFollowUp = useCallback(
    (message: string) => {
      if (!canSendMessage || sending.current || !message.trim()) return;
      sending.current = true;
      try {
        sendMessage({ message, conversationId });
      } catch (error) {
        sending.current = false;
        throw error;
      }
    },
    [canSendMessage, sendMessage, conversationId]
  );
  const { openSidebarConversation: openSidebarConversationInternal } = useAgentBuilderServices();

  const openCanvas = useCallback(() => {
    openCanvasContext(attachment, isSidebar);
  }, [openCanvasContext, attachment, isSidebar]);

  const updateOrigin = useCallback(
    async (origin: string) => {
      const result = await attachmentsService.updateOrigin(conversationId, attachment.id, origin);
      conversationActions.invalidateConversation();
      return result;
    },
    [attachmentsService, conversationId, attachment.id, conversationActions]
  );

  const openSidebarConversation = useCallback(() => {
    openSidebarConversationInternal({ conversationId });
  }, [conversationId, openSidebarConversationInternal]);

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const attachmentPreviewKey = getAttachmentPreviewKey(
    attachment.id,
    attachment.versionData?.version
  );
  const [dynamicButtonsState, setDynamicButtonsState] = useState<{
    key: string;
    buttons: ActionButton[];
  }>({ key: attachmentPreviewKey, buttons: [] });

  const registerActionButtons = useCallback(
    (buttons: ActionButton[]) => {
      setDynamicButtonsState({ key: attachmentPreviewKey, buttons });
    },
    [attachmentPreviewKey]
  );

  const staticActionButtons = useMemo(
    () =>
      uiDefinition?.getActionButtons?.({
        attachment,
        isSidebar,
        agentId,
        sendMessage: canSendMessage ? sendFollowUp : undefined,
        updateOrigin,
        openCanvas,
        openSidebarConversation: isSidebar ? undefined : openSidebarConversation,
        isCanvas: false,
        setPreviewBadgeState: (nextPreviewState) => {
          setPreviewedAttachmentKey(
            nextPreviewState === 'previewing' ? attachmentPreviewKey : null
          );
        },
      }) ?? [],
    [
      uiDefinition,
      attachment,
      isSidebar,
      agentId,
      canSendMessage,
      sendFollowUp,
      updateOrigin,
      openCanvas,
      setPreviewedAttachmentKey,
      attachmentPreviewKey,
      openSidebarConversation,
    ]
  );

  const inlineActionButtons = useMemo(
    () => [
      ...staticActionButtons,
      ...(dynamicButtonsState.key === attachmentPreviewKey ? dynamicButtonsState.buttons : []),
    ],
    [staticActionButtons, attachmentPreviewKey, dynamicButtonsState]
  );

  const isPreviewingAttachment = previewedAttachmentKey === attachmentPreviewKey;

  const resolvedPreviewBadgeState: AttachmentPreviewState =
    previewBadgeState ?? (isPreviewingAttachment ? 'previewing' : 'none');

  if (!uiDefinition) {
    return null;
  }

  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type.toUpperCase();
  const header = uiDefinition?.getHeader?.({ attachment });
  const maxWidth = uiDefinition?.getMaxWidth?.(attachment);
  const isHeaderOnly = !uiDefinition.renderInlineContent;

  return (
    <EuiSplitPanel.Outer
      grow
      hasShadow={false}
      hasBorder={true}
      css={css`
        overflow: visible; // allow vis actions to overflow
        border-radius: ${AB_PANEL_RADIUS}px;
        ${maxWidth !== undefined ? `max-width: ${maxWidth}px;` : ''}
      `}
    >
      <AttachmentHeader
        icon={header?.icon}
        title={title}
        subtitle={header?.subtitle}
        badges={header?.badges}
        actionButtons={inlineActionButtons}
        previewBadgeState={resolvedPreviewBadgeState}
        onClosePreview={closeCanvas}
        isHeaderOnly={isHeaderOnly}
      />
      {!isHeaderOnly && (
        <EuiSplitPanel.Inner
          grow={false}
          paddingSize="none"
          css={css`
            border-radius: 0 0 ${AB_PANEL_RADIUS}px ${AB_PANEL_RADIUS}px;
            overflow: hidden;

            /* Nested panels default to EUI medium radius (6px); match the card shell (12px). */
            > .euiPanel {
              border-radius: 0 0 ${AB_PANEL_RADIUS}px ${AB_PANEL_RADIUS}px;
            }
          `}
        >
          <TimelineRenderErrorBoundary key={attachmentPreviewKey}>
            {() =>
              uiDefinition.renderInlineContent?.(
                {
                  attachment,
                  isSidebar,
                  screenContext,
                  openSidebarConversation: isSidebar ? undefined : openSidebarConversation,
                },
                {
                  registerActionButtons,
                }
              )
            }
          </TimelineRenderErrorBoundary>
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};

export const InlineAttachmentWithActions = React.memo(
  InlineAttachmentWithActionsComponent,
  areInlineAttachmentPropsEqual
);
InlineAttachmentWithActions.displayName = 'InlineAttachmentWithActions';

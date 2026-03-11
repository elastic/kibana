/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type {
  UnknownAttachment,
  ScreenContextAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import { EuiSplitPanel } from '@elastic/eui';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { usePersistedConversationId } from '../../../../../hooks/use_persisted_conversation_id';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { AttachmentHeader } from './attachment_header';
import { useCanvasContext } from './canvas_context';

interface InlineAttachmentWithActionsProps {
  attachment: UnknownAttachment;
  attachmentsService: AttachmentsService;
  isSidebar: boolean;
  conversationId: string;
  screenContext?: ScreenContextAttachmentData;
}

/**
 * Component that renders an inline attachment with its action buttons.
 */
export const InlineAttachmentWithActions: React.FC<InlineAttachmentWithActionsProps> = ({
  attachment,
  attachmentsService,
  isSidebar,
  conversationId,
  screenContext,
}) => {
  const { openCanvas: openCanvasContext, canvasState } = useCanvasContext();
  const { conversationActions } = useConversationContext();
  const { openConversationFlyout } = useAgentBuilderServices();
  const { updatePersistedConversationId } = usePersistedConversationId({});

  const openCanvas = useCallback(() => {
    openCanvasContext(attachment, isSidebar);
  }, [openCanvasContext, attachment, isSidebar]);

  const updateOrigin = useCallback(
    async (origin: unknown) => {
      const result = await attachmentsService.updateOrigin(conversationId, attachment.id, origin);
      conversationActions.invalidateConversation();
      return result;
    },
    [attachmentsService, conversationId, attachment.id, conversationActions]
  );

  const openSidebarConversation = useCallback(() => {
    if (conversationId) {
      updatePersistedConversationId(conversationId);
    }
    openConversationFlyout();
  }, [conversationId, updatePersistedConversationId, openConversationFlyout]);

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const inlineActionButtons = useMemo(
    () =>
      uiDefinition?.getActionButtons?.({
        attachment,
        isSidebar,
        updateOrigin,
        openCanvas,
        openSidebarConversation: isSidebar ? undefined : openSidebarConversation,
        isCanvas: false,
      }),
    [uiDefinition, attachment, isSidebar, updateOrigin, openCanvas, openSidebarConversation]
  );

  const isViewingAttachmentInCanvas = useMemo(() => {
    return canvasState?.attachment.id === attachment.id;
  }, [canvasState, attachment]);

  if (!uiDefinition) {
    return null;
  }

  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type.toUpperCase();

  return (
    <EuiSplitPanel.Outer grow hasShadow={false} hasBorder={true}>
      <AttachmentHeader
        title={title}
        actionButtons={inlineActionButtons}
        showCurrentlyPreviewingBadge={isViewingAttachmentInCanvas}
      />
      <EuiSplitPanel.Inner grow={false} paddingSize="none">
        {uiDefinition?.renderInlineContent?.({ attachment, isSidebar, screenContext })}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

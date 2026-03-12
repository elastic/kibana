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
import { AttachmentHeader } from './attachment_header';
import { useCanvasContext } from './canvas_context';

interface InlineAttachmentWithActionsProps {
  attachment: UnknownAttachment;
  version?: number;
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
  version,
  attachmentsService,
  isSidebar,
  conversationId,
  screenContext,
}) => {
  const { openCanvas: openCanvasContext, canvasState } = useCanvasContext();
  const { conversationActions } = useConversationContext();

  const openCanvas = useCallback(() => {
    openCanvasContext(attachment, isSidebar, version);
  }, [openCanvasContext, attachment, isSidebar, version]);

  const updateOrigin = useCallback(
    async (origin: unknown) => {
      const result = await attachmentsService.updateOrigin(conversationId, attachment.id, origin);
      conversationActions.invalidateConversation();
      return result;
    },
    [attachmentsService, conversationId, attachment.id, conversationActions]
  );

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const inlineActionButtons = useMemo(
    () =>
      uiDefinition?.getActionButtons?.({
        attachment,
        isSidebar,
        updateOrigin,
        openCanvas,
        isCanvas: false,
      }),
    [uiDefinition, attachment, isSidebar, updateOrigin, openCanvas]
  );

  const isViewingAttachmentInCanvas = useMemo(() => {
    if (canvasState?.attachment.id !== attachment.id) {
      return false;
    }
    if (version !== undefined && canvasState.version !== undefined) {
      return canvasState.version === version;
    }
    return true;
  }, [canvasState, attachment.id, version]);

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { EuiSplitPanel } from '@elastic/eui';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { AttachmentHeader } from './attachment_header';
import { InlineAttachmentContent } from './inline_attachment_content';
import { useCanvasContext } from './canvas_context';

interface AttachmentWithActionsProps {
  attachment: UnknownAttachment;
  attachmentsService: AttachmentsService;
  isSidebar: boolean;
  conversationId: string;
}

/**
 * Component that renders an attachment with its action buttons.
 */
export const AttachmentWithActions: React.FC<AttachmentWithActionsProps> = ({
  attachment,
  attachmentsService,
  isSidebar,
  conversationId,
}) => {
  const { openCanvas: openCanvasContext } = useCanvasContext();

  const openCanvas = useCallback(() => {
    openCanvasContext(attachment, isSidebar);
  }, [openCanvasContext, attachment, isSidebar]);

  const updateOrigin = useCallback(async (originId: string) => {
    // TODO: Implement updateOrigin
    //   attachmentsService.updateOrigin(conversationId, attachment.id, originId);
  }, []);

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

  if (!uiDefinition) {
    return null;
  }

  const title = attachment.type.toUpperCase(); // TODO: fix this - it won't scale well for all attachment types

  return (
    <EuiSplitPanel.Outer grow hasShadow={false} hasBorder={true}>
      <AttachmentHeader title={title} actionButtons={inlineActionButtons} />
      <InlineAttachmentContent>
        {uiDefinition?.renderInlineContent?.({ attachment, isSidebar })}
      </InlineAttachmentContent>
    </EuiSplitPanel.Outer>
  );
};

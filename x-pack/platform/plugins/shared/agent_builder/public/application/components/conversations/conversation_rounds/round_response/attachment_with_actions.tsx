/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { EuiButton } from '@elastic/eui';
import type { AttachmentsService } from '../../../../../services/attachments/attachements_service';
import { CanvasModeFlyout } from './canvas_mode_flyout';

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
  const [isCanvasFlyoutOpen, setIsCanvasFlyoutOpen] = useState(false);

  const openCanvas = useCallback(() => {
    setIsCanvasFlyoutOpen(true);
  }, []);

  const closeCanvas = useCallback(() => {
    setIsCanvasFlyoutOpen(false);
  }, []);

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  if (!uiDefinition) {
    return null;
  }

  const actionButtons = uiDefinition.getActionButtons?.({
    attachment,
    isSidebar,
    updateOrigin: async (originId: string) => {
      // TODO: Implement updateOrigin
      //   attachmentsService.updateOrigin(conversationId, attachment.id, originId);
    },
    openCanvas,
  });

  return (
    <>
      {actionButtons?.map((button) => (
        <EuiButton key={button.label} onClick={button.handler}>
          {button.label}
        </EuiButton>
      ))}
      {uiDefinition?.renderInlineContent?.({ attachment, isSidebar })}
      {isCanvasFlyoutOpen && uiDefinition?.renderCanvasContent && (
        <CanvasModeFlyout
          isOpen={isCanvasFlyoutOpen}
          onClose={closeCanvas}
          title={attachment.type}
          isSidebar={isSidebar}
        >
          {uiDefinition.renderCanvasContent({ attachment, isSidebar })}
        </CanvasModeFlyout>
      )}
    </>
  );
};

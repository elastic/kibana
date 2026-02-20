/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlyout, EuiFlyoutBody, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
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
  const { canvasState, closeCanvas } = useCanvasContext();

  const updateOrigin = useCallback(async (originId: string) => {
    // TODO: Implement updateOrigin
  }, []);

  const uiDefinition = canvasState
    ? attachmentsService.getAttachmentUiDefinition(canvasState.attachment.type)
    : null;

  const canvasHeaderActionButtons = useMemo(() => {
    if (!canvasState || !uiDefinition?.getActionButtons) {
      return [];
    }
    return (
      uiDefinition.getActionButtons({
        attachment: canvasState.attachment,
        isSidebar: canvasState.isSidebar,
        updateOrigin,
        isCanvas: true,
      }) ?? []
    );
  }, [canvasState, uiDefinition, updateOrigin]);

  if (!canvasState || !uiDefinition?.renderCanvasContent) {
    return null;
  }

  const { attachment, isSidebar } = canvasState;
  const title = attachment.type.toUpperCase(); // TODO: fix this - it won't scale well for all attachment types

  const flyoutStyles = !isSidebar
    ? css`
        width: 50vw;
      `
    : undefined;

  const flyoutBodyStyles = css`
    &.euiFlyoutBody {
      padding-top: ${euiTheme.size.m};
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
        {uiDefinition.renderCanvasContent({ attachment, isSidebar })}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

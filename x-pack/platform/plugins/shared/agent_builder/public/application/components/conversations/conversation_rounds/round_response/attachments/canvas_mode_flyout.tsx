/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutBody, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { AttachmentHeader } from './attachment_header';

interface CanvasModeFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isSidebar?: boolean;
  actionButtons?: ActionButton[];
}

/**
 * Flyout component for displaying attachments in canvas mode (expanded view).
 * In full-screen context, renders at 50% screen width. In sidebar context, uses default flyout width.
 */
export const CanvasModeFlyout: React.FC<CanvasModeFlyoutProps> = ({
  isOpen,
  onClose,
  title,
  children,
  isSidebar,
  actionButtons = [],
}) => {
  const { euiTheme } = useEuiTheme();
  // Only apply custom width in full-screen context (not sidebar)
  const flyoutStyles = !isSidebar
    ? css`
        width: 50vw;
      `
    : undefined;

  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="canvasModeFlyoutTitle"
      ownFocus={false}
      outsideClickCloses={true}
      css={flyoutStyles}
      type={isSidebar ? 'overlay' : 'push'}
      hideCloseButton
      paddingSize="none"
    >
      <AttachmentHeader
        title={title}
        actionButtons={actionButtons}
        onClose={onClose}
        showPreviewBadge
      />
      <EuiFlyoutBody
        css={css`
          &.euiFlyoutBody {
            padding-top: ${euiTheme.size.m};
          }
        `}
      >
        {children}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

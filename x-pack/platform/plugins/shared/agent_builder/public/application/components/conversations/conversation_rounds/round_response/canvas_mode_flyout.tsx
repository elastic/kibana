/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface CanvasModeFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  isSidebar?: boolean;
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
}) => {
  const { euiTheme } = useEuiTheme();

  // Only apply custom width in full-screen context (not sidebar)
  const flyoutStyles = !isSidebar
    ? css`
        width: 50vw;
      `
    : undefined;

  const headerStyles = css`
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
  `;

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
    >
      <EuiFlyoutHeader hasBorder css={headerStyles}>
        <EuiTitle size="m">
          <h2 id="canvasModeFlyoutTitle">
            {title ||
              i18n.translate('xpack.agentBuilder.canvasMode.defaultTitle', {
                defaultMessage: 'Canvas Mode',
              })}
          </h2>
        </EuiTitle>
        <EuiButtonIcon
          onClick={onClose}
          iconType="cross"
          aria-label={i18n.translate('xpack.agentBuilder.canvasMode.closeButton', {
            defaultMessage: 'Close canvas mode',
          })}
          css={css`
            position: absolute;
            right: ${euiTheme.size.m};
            top: ${euiTheme.size.m};
          `}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
    </EuiFlyout>
  );
};

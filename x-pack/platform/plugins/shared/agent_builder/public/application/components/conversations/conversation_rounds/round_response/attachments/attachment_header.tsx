/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import { AttachmentActions } from './attachment_actions';

const PREVIEW_ONLY_LABEL = i18n.translate('xpack.agentBuilder.attachmentHeader.previewOnly', {
  defaultMessage: 'Preview Only',
});

const CURRENTLY_PREVIEWING_LABEL = i18n.translate(
  'xpack.agentBuilder.attachmentHeader.currentlyPreviewing',
  {
    defaultMessage: "You're previewing this",
  }
);

const CLOSE_BUTTON_ARIA_LABEL = i18n.translate('xpack.agentBuilder.attachmentHeader.close', {
  defaultMessage: 'Close',
});

const HEADER_HEIGHT = 72;

interface AttachmentHeaderProps {
  title: string;
  actionButtons?: ActionButton[];
  onClose?: () => void;
  /**
   * Controls preview UI state from the parent.
   * - none: show regular action buttons
   * - preview_only: show "Preview Only" badge
   * - currently_previewing: show "You're previewing this" and hide action buttons
   */
  previewState?: 'none' | 'preview_only' | 'currently_previewing';
  // Backward-compatible props. Prefer `previewState`.
  showPreviewBadge?: boolean;
  showCurrentlyPreviewingBadge?: boolean;
}

export const AttachmentHeader: React.FC<AttachmentHeaderProps> = ({
  title,
  actionButtons,
  onClose,
  previewState,
  showPreviewBadge = false,
  showCurrentlyPreviewingBadge = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const textStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const headerStyles = css`
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    min-height: ${HEADER_HEIGHT}px;
  `;

  const badgeStyles = css`
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translate(-50%, 50%);
    z-index: ${euiTheme.levels.content};
  `;

  if (!actionButtons || actionButtons.length === 0) {
    return null;
  }

  const resolvedPreviewState =
    previewState ??
    (showCurrentlyPreviewingBadge
      ? 'currently_previewing'
      : showPreviewBadge
      ? 'preview_only'
      : 'none');

  return (
    <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
      {resolvedPreviewState === 'preview_only' && (
        <EuiBadge iconType="lock" color="primary" css={badgeStyles}>
          {PREVIEW_ONLY_LABEL}
        </EuiBadge>
      )}
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText css={textStyles} size="s">
            {title}
          </EuiText>
        </EuiFlexItem>
        {resolvedPreviewState !== 'currently_previewing' && (
          <AttachmentActions buttons={actionButtons} />
        )}
        {resolvedPreviewState === 'currently_previewing' && (
          <EuiBadge iconType="eye" color="success">
            {CURRENTLY_PREVIEWING_LABEL}
          </EuiBadge>
        )}
        {onClose && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={CLOSE_BUTTON_ARIA_LABEL}
              iconType="cross"
              onClick={onClose}
              size="s"
              color="text"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSplitPanel,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
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

export const HEADER_HEIGHT = 72;

interface AttachmentHeaderProps {
  title: string;
  /** Optional icon rendered to the left of the title, sized to span title + badge height. */
  icon?: IconType;
  /** Optional badge or content rendered below the title, inside the header. */
  headerBadge?: ReactNode;
  actionButtons?: ActionButton[];
  onClose?: () => void;
  /**
   * Controls preview UI state from the parent.
   * - none: show regular action buttons
   * - preview_available: show "Preview Only" badge
   * - previewing: show "You're previewing this" and hide action buttons
   */
  previewBadgeState?: 'none' | 'preview_available' | 'previewing';
}

export const AttachmentHeader: React.FC<AttachmentHeaderProps> = ({
  title,
  icon,
  headerBadge,
  actionButtons,
  onClose,
  previewBadgeState = 'none',
}) => {
  const { euiTheme } = useEuiTheme();

  const headerStyles = css`
    position: relative;
    display: flex;
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

  const iconContainerStyles = css`
    border-right: ${euiTheme.border.thin};
    padding: ${euiTheme.size.m};
    padding-left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `;

  if (!actionButtons?.length && !icon && !headerBadge) {
    return null;
  }

  return (
    <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
      {previewBadgeState === 'preview_available' && (
        <EuiBadge iconType="lock" color="primary" css={badgeStyles}>
          {PREVIEW_ONLY_LABEL}
        </EuiBadge>
      )}
      <EuiFlexGroup
        responsive={false}
        justifyContent="spaceBetween"
        alignItems="center"
        style={{ width: '100%' }}
        gutterSize="s"
      >
        {icon && (
          <EuiFlexItem grow={false}>
            <div css={iconContainerStyles}>
              <EuiIcon type={icon} size="l" color="subdued" aria-hidden={true} />
            </div>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            alignItems="flexStart"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                {/* h3 would be semantically preferred, but browser UA styles override EuiTitle's size prop here; h5 native size is close enough to xs that it doesn't. */}
                <h5>{title}</h5>
              </EuiTitle>
            </EuiFlexItem>
            {headerBadge && <EuiFlexItem grow={false}>{headerBadge}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>
        {previewBadgeState !== 'previewing' && actionButtons?.length ? (
          <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
            <AttachmentActions buttons={actionButtons} />
          </EuiFlexItem>
        ) : null}
        {previewBadgeState === 'previewing' && (
          <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
            <EuiBadge iconType="eye" color="success">
              {CURRENTLY_PREVIEWING_LABEL}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {onClose && (
          <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
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

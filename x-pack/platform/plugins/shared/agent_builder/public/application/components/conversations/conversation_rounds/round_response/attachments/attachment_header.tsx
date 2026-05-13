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
  EuiIcon,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionButton, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
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
  icon?: IconType;
  title: string;
  /** Optional subtitle rendered under the title. */
  subtitle?: string;
  /** Optional badges rendered alongside the title. */
  badges?: HeaderBadge[];
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
  icon,
  title,
  subtitle,
  badges,
  actionButtons,
  onClose,
  previewBadgeState = 'none',
}) => {
  const { euiTheme } = useEuiTheme();

  const textStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `;

  const subtitleStyles = css`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `;

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

  const hasActionButtons = actionButtons && actionButtons.length > 0;

  return (
    <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
      {previewBadgeState === 'preview_available' && (
        <EuiBadge iconType="lock" color="primary" css={badgeStyles}>
          {PREVIEW_ONLY_LABEL}
        </EuiBadge>
      )}
      <EuiFlexGroup
        responsive={false}
        direction="row"
        justifyContent="spaceBetween"
        alignItems="center"
        style={{ width: '100%' }}
      >
        {icon && (
          <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
            <EuiIcon type={icon} size="l" aria-hidden={true} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            responsive={false}
            style={{ minWidth: 0 }}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                gutterSize="xs"
                alignItems="center"
                responsive={false}
                wrap
                style={{ minWidth: 0 }}
              >
                <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
                  <EuiText css={textStyles} size="s">
                    {title}
                  </EuiText>
                </EuiFlexItem>
                {badges?.map((badge, index) => (
                  <EuiFlexItem grow={false} key={index}>
                    <EuiBadge color={badge.color} iconType={badge.iconType}>
                      {badge.label}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
            {subtitle && (
              <EuiFlexItem grow={false}>
                <EuiText css={subtitleStyles} size="xs" color="subdued">
                  {subtitle}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {previewBadgeState !== 'previewing' && hasActionButtons && (
          <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
            <AttachmentActions buttons={actionButtons} />
          </EuiFlexItem>
        )}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionButton, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import { AttachmentActions } from './attachment_actions';

const PREVIEW_ONLY_LABEL = i18n.translate('xpack.agentBuilder.attachmentHeader.previewOnly', {
  defaultMessage: 'Read-only preview',
});

const CLOSE_PREVIEW_LABEL = i18n.translate('xpack.agentBuilder.attachmentHeader.closePreview', {
  defaultMessage: 'Close preview',
});

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
  onClosePreview?: () => void;
  /**
   * Controls preview UI state from the parent.
   * - none: show regular action buttons
   * - preview_available: show "Preview Only" badge
   * - previewing: show "Close preview" button and hide action buttons
   */
  previewBadgeState?: 'none' | 'preview_available' | 'previewing';
}

export const COMPACT_WIDTH_THRESHOLD = 560;

export const AttachmentHeader: React.FC<AttachmentHeaderProps> = ({
  icon,
  title,
  subtitle,
  badges,
  actionButtons,
  onClose,
  onClosePreview,
  previewBadgeState = 'none',
}) => {
  const { euiTheme } = useEuiTheme();

  const measureRef = useRef<HTMLDivElement | null>(null);
  const { width: headerWidth } = useResizeObserver(measureRef.current);
  const isCompact = headerWidth > 0 && headerWidth <= COMPACT_WIDTH_THRESHOLD;

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
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    min-height: ${isCompact ? 'auto' : `${HEADER_HEIGHT}px`};
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
    <div ref={measureRef} style={{ width: '100%' }}>
      <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
        {previewBadgeState === 'preview_available' && (
          <EuiBadge iconType="readOnly" css={badgeStyles}>
            {PREVIEW_ONLY_LABEL}
          </EuiBadge>
        )}
        <EuiFlexGroup
          responsive={false}
          direction={isCompact ? 'column' : 'row'}
          justifyContent="spaceBetween"
          alignItems={isCompact ? 'flexStart' : 'center'}
          gutterSize={isCompact ? 's' : 'm'}
          style={{ width: '100%' }}
        >
          {/* Start: icon + title/badges/subtitle */}
          <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
            <EuiFlexGroup
              gutterSize="m"
              alignItems="center"
              responsive={false}
              style={{ minWidth: 0 }}
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
            </EuiFlexGroup>
          </EuiFlexItem>
          {/* End: action buttons + close button */}
          <EuiFlexItem
            grow={false}
            style={isCompact ? { alignSelf: 'flex-end', flexShrink: 0 } : { flexShrink: 0 }}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {previewBadgeState !== 'previewing' && hasActionButtons && (
                <EuiFlexItem grow={false}>
                  <AttachmentActions buttons={actionButtons} />
                </EuiFlexItem>
              )}
              {previewBadgeState === 'previewing' && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="text" size="s" iconType="cross" onClick={onClosePreview}>
                    {CLOSE_PREVIEW_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';

const removeAriaLabel = i18n.translate(
  'xpack.agentBuilder.thumbnailAttachmentPill.removeAriaLabel',
  {
    defaultMessage: 'Remove attachment',
  }
);

export interface ThumbnailAttachmentPillProps {
  /** Attachment id — used for the data-test-subj selector. */
  attachmentId: string;
  /** Resolved thumbnail URL or data-URL. */
  thumbnailUrl: string;
  /** Human-readable label used as the img alt text. */
  label: string;
  onRemoveAttachment?: () => void;
  isHighlighted?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

export const ThumbnailAttachmentPill: React.FC<ThumbnailAttachmentPillProps> = ({
  attachmentId,
  thumbnailUrl,
  label,
  onRemoveAttachment,
  isHighlighted = false,
  onHoverStart,
  onHoverEnd,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isHovered, setIsHovered] = useState(false);
  const canRemoveAttachment = Boolean(onRemoveAttachment);

  return (
    <div
      css={css`
        position: relative;
        width: 72px;
        height: 32px;
        border-radius: ${euiTheme.border.radius.small};
        overflow: hidden;
        flex-shrink: 0;
        outline: 2px solid transparent;
        outline-offset: 1px;
        transition: outline-color ${euiTheme.animation.fast};
        ${isHighlighted ? `outline-color: ${euiTheme.colors.borderStrongPrimary};` : ''}
      `}
      tabIndex={0}
      onMouseEnter={() => {
        setIsHovered(true);
        onHoverStart?.();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHoverEnd?.();
      }}
      data-test-subj={`agentBuilderAttachmentPill-${attachmentId}`}
    >
      <img
        src={thumbnailUrl}
        alt={label}
        css={css`
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        `}
      />
      {canRemoveAttachment && isHovered && (
        <div
          css={css`
            position: absolute;
            inset: 0;
            background: ${euiTheme.colors.backgroundLightPrimary};
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <EuiButtonIcon
            iconType="cross"
            size="s"
            style={{ color: euiTheme.colors.textPrimary }}
            aria-label={removeAriaLabel}
            onClick={onRemoveAttachment}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.conversation.REMOVE_ATTACHMENT,
              detail: 'conversation',
            })}
          />
        </div>
      )}
    </div>
  );
};

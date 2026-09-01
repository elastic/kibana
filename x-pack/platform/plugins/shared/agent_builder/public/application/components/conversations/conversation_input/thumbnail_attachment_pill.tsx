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

const PILL_WIDTH = 72;
const PILL_HEIGHT = 32;

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
        width: ${PILL_WIDTH}px;
        height: ${PILL_HEIGHT}px;
        aspect-ratio: ${PILL_WIDTH} / ${PILL_HEIGHT};
        border-radius: ${euiTheme.size.s};
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        box-shadow: 0 0 0 ${euiTheme.border.width.thin}
          ${isHighlighted
            ? euiTheme.colors.borderStrongPrimary
            : isHovered
            ? euiTheme.colors.borderBasePrimary
            : euiTheme.colors.borderBaseSubdued};
        overflow: hidden;
        flex-shrink: 0;

        .agentBuilderThumbnailRemoveButton {
          opacity: 0;
        }
        &:hover .agentBuilderThumbnailRemoveButton,
        &:focus-within .agentBuilderThumbnailRemoveButton {
          opacity: 1;
        }
      `}
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
      <div
        css={css`
          position: absolute;
          inset: 0;
          background-color: ${euiTheme.colors.backgroundLightPrimary};
          opacity: ${isHovered ? 0.75 : 0};
          pointer-events: none;
        `}
      />
      {canRemoveAttachment && (
        <EuiButtonIcon
          iconType="cross"
          size="s"
          className="agentBuilderThumbnailRemoveButton"
          css={css`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${euiTheme.size.l};
            height: ${euiTheme.size.l};
            border-radius: ${euiTheme.border.radius.small};
            color: ${euiTheme.colors.textPrimary};
            &:focus {
              opacity: 1;
            }
            &::before {
              display: none;
            }
          `}
          aria-label={removeAriaLabel}
          onClick={onRemoveAttachment}
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.REMOVE_ATTACHMENT,
            detail: 'conversation',
          })}
        />
      )}
    </div>
  );
};

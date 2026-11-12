/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { AttachmentTile } from './attachment_tile';

export interface ThumbnailAttachmentPillProps {
  /** Attachment id — used for the data-test-subj selector. */
  attachmentId: string;
  /** Resolved thumbnail URL or data-URL. */
  thumbnailUrl: string;
  /** Human-readable label used as the img alt text. */
  label: string;
  onRemoveAttachment?: () => void;
  isHighlighted?: boolean;
}

export const ThumbnailAttachmentPill: React.FC<ThumbnailAttachmentPillProps> = ({
  attachmentId,
  thumbnailUrl,
  label,
  onRemoveAttachment,
  isHighlighted = false,
}) => (
  <AttachmentTile
    attachmentId={attachmentId}
    onRemoveAttachment={onRemoveAttachment}
    isHighlighted={isHighlighted}
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
  </AttachmentTile>
);

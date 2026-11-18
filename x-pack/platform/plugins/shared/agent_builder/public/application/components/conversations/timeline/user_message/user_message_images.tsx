/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ThumbnailAttachmentPill } from '../../conversation_input/thumbnail_attachment_pill';
import type { UserMessageThumbnail } from './use_user_message_thumbnails';
import { ImagePreviewModal } from './image_preview_modal';

export interface UserMessageImagesProps {
  thumbnails: UserMessageThumbnail[];
  /** When set, the thumbnail whose data.name matches is highlighted. */
  hoveredImageName?: string | null;
}

export const UserMessageImages: React.FC<UserMessageImagesProps> = ({
  thumbnails,
  hoveredImageName,
}) => {
  const [previewed, setPreviewed] = useState<UserMessageThumbnail | null>(null);

  if (thumbnails.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="row" wrap responsive={false} gutterSize="s">
        {thumbnails.map((thumbnail) => {
          const { key, name, ...pillProps } = thumbnail;
          return (
            <EuiFlexItem grow={false} key={key}>
              <ThumbnailAttachmentPill
                {...pillProps}
                isHighlighted={hoveredImageName != null && hoveredImageName === name}
                onClick={() => setPreviewed(thumbnail)}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      {previewed && (
        <ImagePreviewModal
          src={previewed.thumbnailUrl}
          label={previewed.label}
          onClose={() => setPreviewed(null)}
        />
      )}
    </EuiFlexItem>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ThumbnailAttachmentPill } from '../../conversation_input/thumbnail_attachment_pill';
import type { UserMessageThumbnail } from './use_user_message_thumbnails';

export interface UserMessageImagesProps {
  thumbnails: UserMessageThumbnail[];
  /** When set, the thumbnail whose data.name matches is highlighted. */
  hoveredImageName?: string | null;
}

export const UserMessageImages: React.FC<UserMessageImagesProps> = ({
  thumbnails,
  hoveredImageName,
}) => {
  if (thumbnails.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="row" wrap responsive={false} gutterSize="s">
        {thumbnails.map(({ key, name, ...pillProps }) => (
          <EuiFlexItem grow={false} key={key}>
            <ThumbnailAttachmentPill
              {...pillProps}
              isHighlighted={hoveredImageName != null && hoveredImageName === name}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

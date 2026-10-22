/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FileAttachmentPill } from '../../conversation_input/file_attachment_pill';
import { ThumbnailAttachmentPill } from '../../conversation_input/thumbnail_attachment_pill';
import type { UserMessageFile } from './use_user_message_files';
import type { UserMessageThumbnail } from './use_user_message_thumbnails';

export interface UserMessageAttachmentTilesProps {
  thumbnails: UserMessageThumbnail[];
  files?: UserMessageFile[];
  /** When set, the tile whose file name matches is highlighted. */
  hoveredAttachmentName?: string | null;
}

export const UserMessageAttachmentTiles: React.FC<UserMessageAttachmentTilesProps> = ({
  thumbnails,
  files = [],
  hoveredAttachmentName,
}) => {
  if (thumbnails.length === 0 && files.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="row" wrap responsive={false} gutterSize="s">
        {thumbnails.map(({ key, name, ...pillProps }) => (
          <EuiFlexItem grow={false} key={key}>
            <ThumbnailAttachmentPill
              {...pillProps}
              isHighlighted={hoveredAttachmentName != null && hoveredAttachmentName === name}
            />
          </EuiFlexItem>
        ))}
        {files.map(({ key, attachmentId, name, mimeType }) => (
          <EuiFlexItem grow={false} key={key}>
            <FileAttachmentPill
              attachmentId={attachmentId}
              name={name}
              mimeType={mimeType}
              isHighlighted={hoveredAttachmentName != null && hoveredAttachmentName === name}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

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

type Tile = ({ kind: 'thumbnail' } & UserMessageThumbnail) | ({ kind: 'file' } & UserMessageFile);

export const UserMessageAttachmentTiles: React.FC<UserMessageAttachmentTilesProps> = ({
  thumbnails,
  files = [],
  hoveredAttachmentName,
}) => {
  if (thumbnails.length === 0 && files.length === 0) {
    return null;
  }

  const tiles: Tile[] = [
    ...thumbnails.map((thumbnail) => ({ kind: 'thumbnail' as const, ...thumbnail })),
    ...files.map((file) => ({ kind: 'file' as const, ...file })),
  ].sort((a, b) => a.order - b.order);

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="row" wrap responsive={false} gutterSize="s">
        {tiles.map((tile) => (
          <EuiFlexItem grow={false} key={tile.key}>
            {tile.kind === 'thumbnail' ? (
              <ThumbnailAttachmentPill
                attachmentId={tile.attachmentId}
                thumbnailUrl={tile.thumbnailUrl}
                label={tile.label}
                isHighlighted={hoveredAttachmentName != null && hoveredAttachmentName === tile.name}
              />
            ) : (
              <FileAttachmentPill
                attachmentId={tile.attachmentId}
                name={tile.name}
                mimeType={tile.mimeType}
                isHighlighted={hoveredAttachmentName != null && hoveredAttachmentName === tile.name}
              />
            )}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { UnifiedReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
import type { FileAttachmentMetadata } from '../../../../common/types/domain/attachment/file/v2';
import { MarkdownRenderer } from '../../markdown_editor/renderer';
import { FileThumbnail } from './file_thumbnail';
import {
  getFileFromReferenceMetadata,
  getFileMessageContent,
  isImage,
  isValidFileMetadata,
} from './utils';

export type FileMessageProps = UnifiedReferenceAttachmentViewProps<FileAttachmentMetadata>;

/** The text sent with a file, followed by its thumbnail when the file is an image. */
export const FileMessage = React.memo((props: FileMessageProps) => {
  const content = getFileMessageContent(props.data);
  const fileId = Array.isArray(props.attachmentId) ? props.attachmentId[0] : props.attachmentId;
  const showThumbnail =
    isValidFileMetadata(props.metadata) &&
    isImage(getFileFromReferenceMetadata({ fileId, metadata: props.metadata }));

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="cases-file-message">
      {content && (
        <EuiFlexItem grow={false}>
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </EuiFlexItem>
      )}
      {showThumbnail && (
        <EuiFlexItem grow={false}>
          <FileThumbnail {...props} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

FileMessage.displayName = 'FileMessage';

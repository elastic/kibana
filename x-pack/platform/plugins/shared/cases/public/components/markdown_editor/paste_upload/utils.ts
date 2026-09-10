/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import type { MarkdownEditorRef } from '../types';

/**
 * Returns a markdown link for the file with a link to the asset
 */
export const markdownImage = (fileName: string, fileUrl: string, ext?: string) =>
  `![${fileName}${ext ? `.${ext}` : ''}](${fileUrl})`;

/**
 * Gets the reference to the textarea element from the markdown editor
 */
export function getTextarea(editorRef: React.ForwardedRef<MarkdownEditorRef | null>) {
  if (!editorRef || typeof editorRef === 'function' || !editorRef.current) {
    return null;
  }
  return editorRef.current.textarea;
}

export function canUpload(uploadState: UploadState, caseId: string) {
  return uploadState.hasFiles() && !uploadState.isUploading() && caseId;
}

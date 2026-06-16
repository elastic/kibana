/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMarkdownEditorStorageKey } from '../../markdown_editor/utils';
import type { EditableMarkdownRefObject } from '../../markdown_editor';

export const getDescriptionPreview = (description: string): string => {
  if (!description) {
    return '';
  }

  return description
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_~`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getDraftDescription = (
  applicationId = '',
  caseId: string,
  commentId: string
): string | null => {
  const draftStorageKey = getMarkdownEditorStorageKey({ appId: applicationId, caseId, commentId });

  return sessionStorage.getItem(draftStorageKey);
};

export const isCommentRef = (
  ref: EditableMarkdownRefObject | null | undefined
): ref is EditableMarkdownRefObject => {
  const commentRef = ref as EditableMarkdownRefObject;
  return commentRef?.setComment != null;
};

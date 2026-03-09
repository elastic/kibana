/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { getMarkdownEditorStorageKey } from '../../markdown_editor/utils';

export const getCommentFooterCss = (euiTheme?: EuiThemeComputed<{}>) => {
  if (!euiTheme) {
    return css``;
  }
  return css`
    border-top: ${euiTheme.border.thin};
    padding: ${euiTheme.size.s};
  `;
};

export const hasDraftComment = (
  applicationId = '',
  caseId: string,
  commentId: string,
  comment: string
): boolean => {
  const draftStorageKey = getMarkdownEditorStorageKey({ appId: applicationId, caseId, commentId });
  const sessionValue = sessionStorage.getItem(draftStorageKey);
  return Boolean(sessionValue && sessionValue !== comment);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getMarkdownEditorStorageKey = ({
  caseId,
  commentId,
  appId,
}: {
  caseId: string;
  commentId: string;
  appId?: string;
}): string => {
  const appIdKey = appId && appId !== '' ? appId : 'cases';
  const caseIdKey = caseId !== '' ? caseId : 'case';
  const commentIdKey = commentId !== '' ? commentId : 'comment';

  return `cases.${appIdKey}.${caseIdKey}.${commentIdKey}.markdownEditor`;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMarkdownEditorStorageKey, isOwner } from './utils';

describe('getMarkdownEditorStorageKey', () => {
  it('should return correct session key', () => {
    const appId = 'security-solution';
    const caseId = 'case-id';
    const commentId = 'comment-id';
    const sessionKey = getMarkdownEditorStorageKey({ appId, caseId, commentId });
    expect(sessionKey).toEqual(`cases.${appId}.${caseId}.${commentId}.markdownEditor`);
  });

  it('should return default key when comment id is empty ', () => {
    const appId = 'security-solution';
    const caseId = 'case-id';
    const commentId = '';
    const sessionKey = getMarkdownEditorStorageKey({ appId, caseId, commentId });
    expect(sessionKey).toEqual(`cases.${appId}.${caseId}.comment.markdownEditor`);
  });

  it('should return default key when case id is empty ', () => {
    const appId = 'security-solution';
    const caseId = '';
    const commentId = 'comment-id';
    const sessionKey = getMarkdownEditorStorageKey({ appId, caseId, commentId });
    expect(sessionKey).toEqual(`cases.${appId}.case.${commentId}.markdownEditor`);
  });

  it('should return default key when app id is empty ', () => {
    const appId = '';
    const caseId = 'case-id';
    const commentId = 'comment-id';
    const sessionKey = getMarkdownEditorStorageKey({ appId, caseId, commentId });
    expect(sessionKey).toEqual(`cases.cases.${caseId}.${commentId}.markdownEditor`);
  });

  it('should return default key when app id is undefined', () => {
    const caseId = 'case-id';
    const commentId = 'comment-id';
    const sessionKey = getMarkdownEditorStorageKey({ caseId, commentId });
    expect(sessionKey).toEqual(`cases.cases.${caseId}.${commentId}.markdownEditor`);
  });
});

describe('isOwner', () => {
  it('returns true for a valid owner', () => {
    expect(isOwner('cases')).toBe(true);
  });

  it('returns false for an invalid owner', () => {
    expect(isOwner('notAnOwner')).toBe(false);
  });
});

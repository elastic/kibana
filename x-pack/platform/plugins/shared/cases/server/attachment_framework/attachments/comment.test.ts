/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_COMMENT_LENGTH } from '../../../common/constants';
import { decodeCommentAttachmentData } from './comment';

describe('decodeCommentAttachmentData', () => {
  it('accepts content at max length', () => {
    const content = Array(MAX_COMMENT_LENGTH).fill('a').join('');

    expect(decodeCommentAttachmentData({ content })).toEqual({ content });
  });

  it('rejects content over max length', () => {
    const content = Array(MAX_COMMENT_LENGTH + 1)
      .fill('a')
      .join('');

    expect(() => decodeCommentAttachmentData({ content })).toThrow(
      `Comment content exceeds maximum length of ${MAX_COMMENT_LENGTH} characters`
    );
  });

  it('rejects empty content', () => {
    expect(() => decodeCommentAttachmentData({ content: '  ' })).toThrow(
      'Comment content must be a non-empty string'
    );
  });
});

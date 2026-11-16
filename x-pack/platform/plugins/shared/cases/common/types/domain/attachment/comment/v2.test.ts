/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMENT_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { MAX_COMMENT_LENGTH } from '../../../../constants';
import { CommentAttachmentPayloadSchema } from './v2';

describe('CommentAttachmentPayloadSchema', () => {
  const validPayload = {
    type: COMMENT_ATTACHMENT_TYPE,
    owner: 'cases',
    data: { content: 'hello world' },
  };

  it('accepts a valid comment payload', () => {
    const result = CommentAttachmentPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts content at the maximum length', () => {
    const content = 'a'.repeat(MAX_COMMENT_LENGTH);
    const result = CommentAttachmentPayloadSchema.safeParse({ ...validPayload, data: { content } });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown metadata field (strict payload)', () => {
    expect(
      CommentAttachmentPayloadSchema.safeParse({ ...validPayload, metadata: null }).success
    ).toBe(false);
    expect(
      CommentAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { foo: 'bar' },
      }).success
    ).toBe(false);
  });

  it('rejects content over the maximum length', () => {
    const content = 'a'.repeat(MAX_COMMENT_LENGTH + 1);
    const result = CommentAttachmentPayloadSchema.safeParse({ ...validPayload, data: { content } });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only content', () => {
    const result = CommentAttachmentPayloadSchema.safeParse({
      ...validPayload,
      data: { content: '   ' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a wrong type literal', () => {
    const result = CommentAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'lens' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing owner', () => {
    const { owner, ...rest } = validPayload;
    const result = CommentAttachmentPayloadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a missing data field', () => {
    const { data, ...rest } = validPayload;
    const result = CommentAttachmentPayloadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

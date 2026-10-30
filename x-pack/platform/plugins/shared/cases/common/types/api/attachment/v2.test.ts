/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_CREATE_ATTACHMENTS, MAX_BULK_GET_ATTACHMENTS } from '../../../constants';
import { parseErrors } from '../../../test_helpers/zod_schema_test_utils';
import { COMMENT_ATTACHMENT_TYPE } from '../../../constants/attachments';
import { AttachmentType } from '../../domain/attachment/v1';
import {
  BulkCreateUnifiedAttachmentsRequestSchema,
  BulkGetUnifiedAttachmentsRequestSchema,
  UnifiedAttachmentsFindQueryParamsSchema,
} from './v2';

describe('UnifiedAttachmentsFindQueryParamsSchema', () => {
  it('accepts an omitted type (every attachment type)', () => {
    expect(UnifiedAttachmentsFindQueryParamsSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a single type string', () => {
    expect(UnifiedAttachmentsFindQueryParamsSchema.safeParse({ type: 'comment' }).success).toBe(
      true
    );
  });

  it('accepts a non-empty type array', () => {
    expect(
      UnifiedAttachmentsFindQueryParamsSchema.safeParse({ type: ['comment', 'security.alert'] })
        .success
    ).toBe(true);
  });

  it('rejects an empty type array', () => {
    expect(UnifiedAttachmentsFindQueryParamsSchema.safeParse({ type: [] }).success).toBe(false);
  });
});

describe('BulkCreateUnifiedAttachmentsRequestSchema', () => {
  const unifiedComment = {
    type: COMMENT_ATTACHMENT_TYPE,
    data: { content: 'Solve this fast!' },
    owner: 'cases',
  };
  const legacyComment = {
    type: AttachmentType.user,
    comment: 'Solve this fast!',
    owner: 'cases',
  };

  it('accepts an empty array', () => {
    expect(BulkCreateUnifiedAttachmentsRequestSchema.safeParse([]).success).toBe(true);
  });

  it(`accepts ${MAX_BULK_CREATE_ATTACHMENTS} attachments`, () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS).fill(unifiedComment);

    expect(BulkCreateUnifiedAttachmentsRequestSchema.safeParse(attachments).success).toBe(true);
  });

  it(`rejects more than ${MAX_BULK_CREATE_ATTACHMENTS} attachments`, () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(unifiedComment);

    expect(BulkCreateUnifiedAttachmentsRequestSchema.safeParse(attachments).success).toBe(false);
  });

  it('rejects a legacy comment payload', () => {
    expect(BulkCreateUnifiedAttachmentsRequestSchema.safeParse([legacyComment]).success).toBe(
      false
    );
  });
});

describe('BulkGetUnifiedAttachmentsRequestSchema', () => {
  it('accepts a single id', () => {
    expect(BulkGetUnifiedAttachmentsRequestSchema.safeParse({ ids: ['a'] }).success).toBe(true);
  });

  it('rejects an empty ids array', () => {
    expect(parseErrors(BulkGetUnifiedAttachmentsRequestSchema, { ids: [] })).toContain(
      'The length of the field ids is too short. Array must be of length >= 1.'
    );
  });

  it(`rejects more than MAX_BULK_GET_ATTACHMENTS (${MAX_BULK_GET_ATTACHMENTS}) ids`, () => {
    const ids = Array(MAX_BULK_GET_ATTACHMENTS + 1).fill('id');
    expect(parseErrors(BulkGetUnifiedAttachmentsRequestSchema, { ids })).toContain(
      `The length of the field ids is too long. Array must be of length <= ${MAX_BULK_GET_ATTACHMENTS}.`
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../constants';
import { COMMENT_ATTACHMENT_TYPE } from '../../../constants/attachments';
import { AttachmentType } from '../../domain/attachment/v1';
import { BulkCreateUnifiedAttachmentsRequestSchema } from '../../api_zod/attachment/v2';
import { BulkCreateUnifiedAttachmentsRequestRt, UnifiedAttachmentsFindQueryParamsRt } from './v2';

describe('UnifiedAttachmentsFindQueryParamsRt', () => {
  it('accepts an omitted type (every attachment type)', () => {
    expect(UnifiedAttachmentsFindQueryParamsRt.decode({})._tag).toBe('Right');
  });

  it('accepts a single type string', () => {
    expect(UnifiedAttachmentsFindQueryParamsRt.decode({ type: 'comment' })._tag).toBe('Right');
  });

  it('accepts a non-empty type array', () => {
    expect(
      UnifiedAttachmentsFindQueryParamsRt.decode({ type: ['comment', 'security.alert'] })._tag
    ).toBe('Right');
  });

  it('rejects an empty type array', () => {
    expect(UnifiedAttachmentsFindQueryParamsRt.decode({ type: [] })._tag).toBe('Left');
  });
});

describe('BulkCreateUnifiedAttachmentsRequestRt', () => {
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
    expect(PathReporter.report(BulkCreateUnifiedAttachmentsRequestRt.decode([]))).toStrictEqual([
      'No errors!',
    ]);
  });

  it(`accepts ${MAX_BULK_CREATE_ATTACHMENTS} attachments`, () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS).fill(unifiedComment);

    expect(
      PathReporter.report(BulkCreateUnifiedAttachmentsRequestRt.decode(attachments))
    ).toStrictEqual(['No errors!']);
  });

  it(`rejects more than ${MAX_BULK_CREATE_ATTACHMENTS} attachments`, () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(unifiedComment);

    expect(
      PathReporter.report(BulkCreateUnifiedAttachmentsRequestRt.decode(attachments))
    ).toContain(
      `The length of the field attachments is too long. Array must be of length <= ${MAX_BULK_CREATE_ATTACHMENTS}.`
    );
  });

  it('rejects a legacy comment payload', () => {
    expect(BulkCreateUnifiedAttachmentsRequestRt.decode([legacyComment])._tag).toBe('Left');
  });

  it('zod: accepts an empty array', () => {
    expect(BulkCreateUnifiedAttachmentsRequestSchema.safeParse([]).success).toBe(true);
  });

  it(`zod: accepts ${MAX_BULK_CREATE_ATTACHMENTS} attachments`, () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS).fill(unifiedComment);

    expect(BulkCreateUnifiedAttachmentsRequestSchema.safeParse(attachments).success).toBe(true);
  });

  it(`zod: rejects more than ${MAX_BULK_CREATE_ATTACHMENTS} attachments`, () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(unifiedComment);

    expect(BulkCreateUnifiedAttachmentsRequestSchema.safeParse(attachments).success).toBe(false);
  });

  it('zod: rejects a legacy comment payload', () => {
    expect(BulkCreateUnifiedAttachmentsRequestSchema.safeParse([legacyComment]).success).toBe(
      false
    );
  });
});

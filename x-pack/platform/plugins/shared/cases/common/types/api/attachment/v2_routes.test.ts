/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_ATTACHMENT_JSON_LENGTH,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_IDS_PER_ATTACHMENT,
  MAX_OWNER_LENGTH,
  MAX_SAVED_OBJECT_VERSION_LENGTH,
} from '../../../constants';
import { AttachmentPatchRequestSchemaV2 } from './v2_union';
import {
  BulkCreateUnifiedAttachmentsRouteRequestSchema,
  UnifiedAttachmentBoundsSchema,
  UnifiedAttachmentPutRouteRequestSchema,
  UnifiedAttachmentRouteRequestSchema,
} from './v2';

describe('UnifiedAttachmentRouteRequestSchema', () => {
  const referencePayload = {
    type: 'security.alert',
    attachmentId: 'alert-1',
    owner: 'securitySolution',
    metadata: { index: '.alerts-security' },
  };
  const valuePayload = {
    type: 'comment',
    owner: 'securitySolution',
    data: { content: 'hello' },
  };

  it('accepts reference and value payloads', () => {
    expect(UnifiedAttachmentRouteRequestSchema.safeParse(referencePayload).success).toBe(true);
    expect(UnifiedAttachmentRouteRequestSchema.safeParse(valuePayload).success).toBe(true);
  });

  it('accepts null data and metadata on a reference payload', () => {
    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({
        ...referencePayload,
        data: null,
        metadata: null,
      }).success
    ).toBe(true);
  });

  it('accepts nested JSON in data', () => {
    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({
        ...valuePayload,
        data: { state: { a: [1, 'two', null, { b: true }] } },
      }).success
    ).toBe(true);
  });

  it('rejects unknown keys', () => {
    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({ ...valuePayload, extra: 'nope' }).success
    ).toBe(false);
  });

  it('rejects a type over the max length', () => {
    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({
        ...valuePayload,
        type: 'a'.repeat(MAX_ATTACHMENT_TYPE_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects an owner over the max length', () => {
    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({
        ...valuePayload,
        owner: 'a'.repeat(MAX_OWNER_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects an attachmentId over the max length', () => {
    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({
        ...referencePayload,
        attachmentId: 'a'.repeat(MAX_ATTACHMENT_ID_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('accepts an attachmentId array at the max size and rejects one above it', () => {
    const ids = (length: number) => Array.from({ length }, (_, i) => `alert-${i}`);

    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({
        ...referencePayload,
        attachmentId: ids(MAX_IDS_PER_ATTACHMENT),
      }).success
    ).toBe(true);
    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({
        ...referencePayload,
        attachmentId: ids(MAX_IDS_PER_ATTACHMENT + 1),
      }).success
    ).toBe(false);
  });

  it('rejects data over the max serialized length', () => {
    const result = UnifiedAttachmentRouteRequestSchema.safeParse({
      ...valuePayload,
      data: {
        a: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH / 2),
        b: 'b'.repeat(MAX_ATTACHMENT_JSON_LENGTH / 2),
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ code: 'custom', path: ['data'] }),
    ]);
  });

  it('rejects metadata over the max serialized length', () => {
    // The nested string fits its own cap, so only the serialized-length check can reject it.
    const result = UnifiedAttachmentRouteRequestSchema.safeParse({
      ...referencePayload,
      metadata: { index: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH) },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ code: 'custom', path: ['metadata'] }),
    ]);
  });

  it('rejects a nested array over the max size', () => {
    const result = UnifiedAttachmentRouteRequestSchema.safeParse({
      ...valuePayload,
      data: { list: Array(MAX_ATTACHMENT_JSON_LENGTH + 1).fill(0) },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'too_big', origin: 'array', path: ['data', 'list'] }),
      ])
    );
  });
});

describe('BulkCreateUnifiedAttachmentsRouteRequestSchema', () => {
  const comment = { type: 'comment', owner: 'securitySolution', data: { content: 'hello' } };

  it('accepts bounded attachments', () => {
    expect(BulkCreateUnifiedAttachmentsRouteRequestSchema.safeParse([comment]).success).toBe(true);
  });

  it('rejects an attachment over the bounds', () => {
    expect(
      BulkCreateUnifiedAttachmentsRouteRequestSchema.safeParse([
        comment,
        { ...comment, owner: 'a'.repeat(MAX_OWNER_LENGTH + 1) },
      ]).success
    ).toBe(false);
  });
});

describe('AttachmentPatchRequestSchemaV2', () => {
  const unifiedPatch = {
    id: 'attachment-1',
    version: 'WzEsMV0=',
    type: 'comment',
    owner: 'securitySolution',
    data: { content: 'hello' },
  };

  it('accepts a unified patch', () => {
    expect(AttachmentPatchRequestSchemaV2.safeParse(unifiedPatch).success).toBe(true);
  });

  it('accepts a legacy patch', () => {
    expect(
      AttachmentPatchRequestSchemaV2.safeParse({
        id: 'attachment-1',
        version: 'WzEsMV0=',
        type: 'user',
        comment: 'hello',
        owner: 'securitySolution',
      }).success
    ).toBe(true);
  });

  it('rejects a unified patch with oversized data', () => {
    expect(
      AttachmentPatchRequestSchemaV2.safeParse({
        ...unifiedPatch,
        data: { content: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH + 1) },
      }).success
    ).toBe(false);
  });
});

describe('UnifiedAttachmentBoundsSchema', () => {
  const payload = { type: 'security.alert', owner: 'securitySolution', attachmentId: 'alert-1' };

  it('accepts a payload without data or metadata', () => {
    expect(UnifiedAttachmentBoundsSchema.safeParse(payload).success).toBe(true);
  });

  it('ignores keys owned by the registered schema', () => {
    expect(UnifiedAttachmentBoundsSchema.safeParse({ ...payload, extra: 'kept' }).success).toBe(
      true
    );
  });

  it('rejects a nested string in data over the max length', () => {
    const result = UnifiedAttachmentBoundsSchema.safeParse({
      ...payload,
      data: { content: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH + 1) },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'too_big', origin: 'string', path: ['data', 'content'] }),
      ])
    );
  });

  it('rejects a key in metadata over the max length', () => {
    const key = 'k'.repeat(MAX_ATTACHMENT_JSON_LENGTH + 1);
    const result = UnifiedAttachmentBoundsSchema.safeParse({ ...payload, metadata: { [key]: 1 } });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_key', path: ['metadata', key] }),
      ])
    );
  });

  it('rejects metadata over the max serialized length', () => {
    const result = UnifiedAttachmentBoundsSchema.safeParse({
      ...payload,
      metadata: { index: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH) },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ code: 'custom', path: ['metadata'] }),
    ]);
  });
});

describe('UnifiedAttachmentPutRouteRequestSchema', () => {
  const payload = {
    type: 'comment',
    owner: 'securitySolution',
    data: { content: 'hello' },
    version: 'WzEsMV0=',
  };

  it('accepts a payload with a version', () => {
    expect(UnifiedAttachmentPutRouteRequestSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects a missing version', () => {
    const { version, ...withoutVersion } = payload;
    expect(UnifiedAttachmentPutRouteRequestSchema.safeParse(withoutVersion).success).toBe(false);
  });

  it('rejects a version over the max length', () => {
    expect(
      UnifiedAttachmentPutRouteRequestSchema.safeParse({
        ...payload,
        version: 'a'.repeat(MAX_SAVED_OBJECT_VERSION_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(
      UnifiedAttachmentPutRouteRequestSchema.safeParse({ ...payload, id: 'attachment-1' }).success
    ).toBe(false);
  });
});

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
import { UnifiedAttachmentPutRouteRequestSchema, UnifiedAttachmentRouteRequestSchema } from './v2';

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
  });

  it('rejects metadata over the max serialized length', () => {
    expect(
      UnifiedAttachmentRouteRequestSchema.safeParse({
        ...referencePayload,
        metadata: { index: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH) },
      }).success
    ).toBe(false);
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

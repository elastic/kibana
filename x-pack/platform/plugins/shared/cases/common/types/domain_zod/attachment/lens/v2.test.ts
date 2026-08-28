/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { isLensPersistableData, LensAttachmentPayloadSchema } from './v2';

describe('LensAttachmentPayloadSchema', () => {
  const validPersistablePayload = {
    type: LENS_ATTACHMENT_TYPE,
    owner: 'cases',
    data: {
      state: {
        attributes: { state: { query: {} } },
        timeRange: { from: 'now-15m', to: 'now' },
      },
    },
  };
  const validSavedObjectPayload = {
    type: LENS_ATTACHMENT_TYPE,
    owner: 'cases',
    attachmentId: 'lens-1',
    metadata: {
      title: 'My Lens visualization',
      soType: 'lens',
    },
    data: {
      attributes: {
        state: { query: {} },
        references: [{ type: 'index-pattern', id: 'data-view-1', name: 'indexpattern-datasource' }],
      },
      timeRange: { from: 'now-15m', to: 'now', mode: 'relative' },
    },
  };

  it('accepts a valid persistable lens payload', () => {
    const result = LensAttachmentPayloadSchema.safeParse(validPersistablePayload);
    expect(result.success).toBe(true);
  });

  it('accepts a valid saved-object lens payload', () => {
    const result = LensAttachmentPayloadSchema.safeParse(validSavedObjectPayload);
    expect(result.success).toBe(true);
  });

  it('accepts a saved-object lens payload without inline data', () => {
    const payload = {
      type: validSavedObjectPayload.type,
      owner: validSavedObjectPayload.owner,
      attachmentId: validSavedObjectPayload.attachmentId,
      metadata: validSavedObjectPayload.metadata,
    };
    const result = LensAttachmentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts an empty `state` bag', () => {
    const result = LensAttachmentPayloadSchema.safeParse({
      ...validPersistablePayload,
      data: { state: {} },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing `state` field on data', () => {
    const result = LensAttachmentPayloadSchema.safeParse({
      ...validPersistablePayload,
      data: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a saved-object payload with the wrong SO type', () => {
    const result = LensAttachmentPayloadSchema.safeParse({
      ...validSavedObjectPayload,
      metadata: { ...validSavedObjectPayload.metadata, soType: 'dashboard' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a wrong type literal', () => {
    const result = LensAttachmentPayloadSchema.safeParse({
      ...validPersistablePayload,
      type: 'comment',
    });
    expect(result.success).toBe(false);
  });

  it('narrows persistable lens data', () => {
    expect(isLensPersistableData(validPersistablePayload.data)).toBe(true);
    expect(isLensPersistableData(validSavedObjectPayload.data)).toBe(false);
  });

  it('does not misclassify an SO snapshot that happens to expose a `state` key alongside `attributes`', () => {
    expect(
      isLensPersistableData({
        attributes: { state: { query: {} } },
        state: 'something',
      })
    ).toBe(false);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { LensAttachmentPayloadSchema } from './v2';

describe('LensAttachmentPayloadSchema', () => {
  const validPayload = {
    type: LENS_ATTACHMENT_TYPE,
    owner: 'cases',
    data: {
      state: {
        attributes: { state: { query: {} } },
        timeRange: { from: 'now-15m', to: 'now' },
      },
    },
  };

  it('accepts a valid lens payload', () => {
    const result = LensAttachmentPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts an empty `state` bag', () => {
    const result = LensAttachmentPayloadSchema.safeParse({
      ...validPayload,
      data: { state: {} },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing `state` field on data', () => {
    const result = LensAttachmentPayloadSchema.safeParse({
      ...validPayload,
      data: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a wrong type literal', () => {
    const result = LensAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'comment' });
    expect(result.success).toBe(false);
  });
});

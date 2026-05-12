/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { LensAttachmentPayloadSchema } from './v2';

describe('LensAttachmentPayloadSchema', () => {
  describe('persistable arm (`data.state`)', () => {
    const persistablePayload = {
      type: LENS_ATTACHMENT_TYPE,
      owner: 'cases',
      data: {
        state: {
          attributes: { state: { query: {} } },
          timeRange: { from: 'now-15m', to: 'now' },
        },
      },
    };

    it('accepts a valid persistable lens payload', () => {
      const result = LensAttachmentPayloadSchema.safeParse(persistablePayload);
      expect(result.success).toBe(true);
    });

    it('accepts an empty `state` bag', () => {
      const result = LensAttachmentPayloadSchema.safeParse({
        ...persistablePayload,
        data: { state: {} },
      });
      expect(result.success).toBe(true);
    });

    it('rejects a missing `state` field on data', () => {
      const result = LensAttachmentPayloadSchema.safeParse({
        ...persistablePayload,
        data: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects a wrong type literal', () => {
      const result = LensAttachmentPayloadSchema.safeParse({
        ...persistablePayload,
        type: 'comment',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SO-ref arm (`attachmentId` + `metadata`)', () => {
    const soRefPayload = {
      type: LENS_ATTACHMENT_TYPE,
      owner: 'cases',
      attachmentId: 'lens-so-id',
      metadata: {
        title: 'My viz',
        soType: 'lens' as const,
      },
    };

    it('accepts a minimal SO-ref payload', () => {
      const result = LensAttachmentPayloadSchema.safeParse(soRefPayload);
      expect(result.success).toBe(true);
    });

    it('accepts a SO-ref payload with a `config` snapshot (LensSavedObjectAttributes shape)', () => {
      const result = LensAttachmentPayloadSchema.safeParse({
        ...soRefPayload,
        metadata: {
          ...soRefPayload.metadata,
          config: {
            title: 'My viz',
            visualizationType: 'lnsXY',
            state: {},
            references: [{ type: 'index-pattern', id: 'foo', name: 'indexpattern-...' }],
          },
          timeRange: { from: 'now-15m', to: 'now' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects a SO-ref payload with the wrong `soType` literal', () => {
      const result = LensAttachmentPayloadSchema.safeParse({
        ...soRefPayload,
        metadata: { ...soRefPayload.metadata, soType: 'dashboard' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a SO-ref payload missing `attachmentId`', () => {
      const result = LensAttachmentPayloadSchema.safeParse({
        type: LENS_ATTACHMENT_TYPE,
        owner: 'cases',
        metadata: soRefPayload.metadata,
      });
      expect(result.success).toBe(false);
    });
  });

  it('rejects a payload with neither `data.state` nor `attachmentId`', () => {
    const result = LensAttachmentPayloadSchema.safeParse({
      type: LENS_ATTACHMENT_TYPE,
      owner: 'cases',
    });
    expect(result.success).toBe(false);
  });
});

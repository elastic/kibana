/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../domain/attachment/v1';
import { AttachmentRequestSchemaV2 } from './v2_union';

describe('Unified Attachments', () => {
  describe('AttachmentRequestSchemaV2', () => {
    it('accepts v1 user comment attachment request', () => {
      const v1Request = {
        comment: 'This is a comment',
        type: AttachmentType.user,
        owner: 'cases',
      };
      const result = AttachmentRequestSchemaV2.safeParse(v1Request);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v1Request);
    });

    it('accepts v2 unified attachment request', () => {
      const v2Request = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'cases',
        data: {
          attributes: { title: 'My Visualization', visualizationType: 'lens' },
          timeRange: { from: 'now-1d', to: 'now' },
        },
        metadata: { description: 'A test visualization' },
      };
      const result = AttachmentRequestSchemaV2.safeParse(v2Request);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v2Request);
    });

    it('accepts v2 unified attachment request with only attachmentId', () => {
      const v2Request = { type: 'lens', owner: 'cases', attachmentId: 'attachment-123' };
      const result = AttachmentRequestSchemaV2.safeParse(v2Request);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v2Request);
    });

    it('accepts v2 unified attachment request with only data', () => {
      const v2Request = {
        type: 'lens',
        owner: 'cases',
        data: { attributes: { title: 'Viz' } },
      };
      const result = AttachmentRequestSchemaV2.safeParse(v2Request);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v2Request);
    });

    it('strips unknown fields from v1 request', () => {
      const v1Request = {
        comment: 'This is a comment',
        type: AttachmentType.user,
        owner: 'cases',
      };
      const result = AttachmentRequestSchemaV2.safeParse({ ...v1Request, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v1Request);
    });
  });
});

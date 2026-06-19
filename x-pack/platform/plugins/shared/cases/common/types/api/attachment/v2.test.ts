/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../domain/attachment/v1';
import { AttachmentRequestSchemaV2, BulkCreateAttachmentsRequestSchemaV2 } from './v2';

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

  describe('BulkCreateAttachmentsRequestSchemaV2', () => {
    it('accepts array of v1 attachment requests', () => {
      const v1Requests = [{ comment: 'First comment', type: AttachmentType.user, owner: 'cases' }];
      const result = BulkCreateAttachmentsRequestSchemaV2.safeParse(v1Requests);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v1Requests);
    });

    it('accepts empty array', () => {
      const result = BulkCreateAttachmentsRequestSchemaV2.safeParse([]);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual([]);
    });

    it('accepts array of v2 unified attachment requests', () => {
      const v2Requests = [
        { type: 'lens', attachmentId: 'attachment-1', owner: 'cases' },
        { type: 'lens', attachmentId: 'attachment-2', owner: 'cases' },
      ];
      const result = BulkCreateAttachmentsRequestSchemaV2.safeParse(v2Requests);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v2Requests);
    });

    it('accepts mixed array of v1 and v2 attachment requests', () => {
      const mixedRequests = [
        { comment: 'A v1 comment', type: AttachmentType.user, owner: 'cases' },
        { type: 'lens', attachmentId: 'attachment-123', owner: 'cases' },
      ];
      const result = BulkCreateAttachmentsRequestSchemaV2.safeParse(mixedRequests);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(mixedRequests);
    });

    it('strips unknown fields from requests in array', () => {
      const requests = [{ comment: 'First comment', type: AttachmentType.user, owner: 'cases' }];
      const result = BulkCreateAttachmentsRequestSchemaV2.safeParse([
        { ...requests[0], foo: 'bar' },
      ]);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requests);
    });
  });
});

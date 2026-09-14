/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../domain/attachment/v1';
import { AttachmentRequestRtV2 } from './v2_union';
import { BulkCreateUnifiedAttachmentsRequestRt } from './v2';
import { AttachmentRequestSchemaV2 } from '../../api_zod/attachment/v2';

describe('Unified Attachments', () => {
  describe('AttachmentRequestRtV2', () => {
    it('accepts v1 user comment attachment request', () => {
      const v1Request = {
        comment: 'This is a comment',
        type: AttachmentType.user,
        owner: 'cases',
      };

      const query = AttachmentRequestRtV2.decode(v1Request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: v1Request,
      });
    });

    it('accepts v2 unified attachment request', () => {
      const v2Request = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'cases',
        data: {
          attributes: {
            title: 'My Visualization',
            visualizationType: 'lens',
          },
          timeRange: {
            from: 'now-1d',
            to: 'now',
          },
        },
        metadata: {
          description: 'A test visualization',
        },
      };

      const query = AttachmentRequestRtV2.decode(v2Request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: v2Request,
      });
    });

    it('accepts v2 unified attachment request with only attachmentId', () => {
      const v2Request = {
        type: 'lens',
        owner: 'cases',
        attachmentId: 'attachment-123',
      };

      const query = AttachmentRequestRtV2.decode(v2Request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: v2Request,
      });
    });

    it('accepts v2 unified attachment request with only data', () => {
      const v2Request = {
        type: 'user',
        owner: 'cases',
        data: {
          content: {
            title: 'My comment',
          },
        },
      };

      const query = AttachmentRequestRtV2.decode(v2Request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: v2Request,
      });
    });

    it('rejects v2 unified attachment request with neither attachmentId nor data', () => {
      const v2Request = {
        type: 'lens',
        owner: 'cases',
      };

      const query = AttachmentRequestRtV2.decode(v2Request);

      expect(query._tag).toBe('Left');
    });

    it('removes foo:bar attributes from v1 request', () => {
      const v1Request = {
        comment: 'This is a comment',
        type: AttachmentType.user,
        owner: 'cases',
        foo: 'bar',
      };

      const query = AttachmentRequestRtV2.decode(v1Request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          comment: 'This is a comment',
          type: AttachmentType.user,
          owner: 'cases',
        },
      });
    });

    it('removes foo:bar attributes from v2 request', () => {
      const v2Request = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'cases',
        data: {
          attributes: {
            title: 'My Visualization',
          },
        },
        metadata: {
          description: 'A test visualization',
        },
        foo: 'bar',
      };

      const query = AttachmentRequestRtV2.decode(v2Request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          type: 'lens',
          attachmentId: 'attachment-123',
          owner: 'cases',
          data: {
            attributes: {
              title: 'My Visualization',
            },
          },
          metadata: {
            description: 'A test visualization',
          },
        },
      });
    });

    it('accepts v1 request even with extra v2 fields (v1 type ignores extra fields)', () => {
      const requestWithExtraFields = {
        comment: 'This is a comment',
        type: AttachmentType.user,
        owner: 'cases',
        attachmentId: 'attachment-123',
        data: {
          content: 'My comment',
        },
      };

      const query = AttachmentRequestRtV2.decode(requestWithExtraFields);

      expect(query._tag).toBe('Right');
      if (query._tag === 'Right') {
        // v1 type matches and strips extra fields
        expect(query.right).toMatchObject({
          comment: 'This is a comment',
          type: AttachmentType.user,
          owner: 'cases',
        });
        expect(query.right).not.toHaveProperty('attachmentId');
        expect(query.right).not.toHaveProperty('data');
      }
    });

    it('zod: accepts v1 user comment attachment request', () => {
      const v1Request = {
        comment: 'This is a comment',
        type: AttachmentType.user,
        owner: 'cases',
      };
      const result = AttachmentRequestSchemaV2.safeParse(v1Request);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v1Request);
    });

    it('zod: accepts v2 unified attachment request', () => {
      const v2Request = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'cases',
      };
      const result = AttachmentRequestSchemaV2.safeParse(v2Request);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v2Request);
    });
  });

  describe('BulkCreateUnifiedAttachmentsRequestRt', () => {
    it('accepts empty array', () => {
      const query = BulkCreateUnifiedAttachmentsRequestRt.decode([]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [],
      });
    });
    it('accepts an array of unified (v2) attachment requests', () => {
      const request = [
        {
          type: 'lens',
          attachmentId: 'attachment-123',
          owner: 'cases',
          data: {
            attributes: { title: 'My Visualization' },
          },
        },
        {
          type: 'user',
          owner: 'cases',
          data: { content: 'This is a comment' },
        },
      ];

      const query = BulkCreateUnifiedAttachmentsRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it('rejects a legacy (v1) attachment request in the array', () => {
      const request = [
        {
          comment: 'This is a comment',
          type: AttachmentType.user,
          owner: 'cases',
        },
      ];

      const query = BulkCreateUnifiedAttachmentsRequestRt.decode(request);

      expect(query._tag).toBe('Left');
    });

    it('rejects an array mixing a unified request with a legacy request', () => {
      const request = [
        {
          type: 'lens',
          attachmentId: 'attachment-123',
          owner: 'cases',
        },
        {
          comment: 'This is a comment',
          type: AttachmentType.user,
          owner: 'cases',
        },
      ];

      const query = BulkCreateUnifiedAttachmentsRequestRt.decode(request);

      expect(query._tag).toBe('Left');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../domain/attachment/v1';
import { AttachmentRequestRtV2, BulkCreateAttachmentsRequestRtV2 } from './v2';

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
  });

  describe('BulkCreateAttachmentsRequestRtV2', () => {
    it('accepts empty array', () => {
      const query = BulkCreateAttachmentsRequestRtV2.decode([]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [],
      });
    });

    it('accepts array of v1 attachment requests', () => {
      const v1Requests = [
        {
          comment: 'First comment',
          type: AttachmentType.user,
          owner: 'cases',
        },
        {
          comment: 'Second comment',
          type: AttachmentType.user,
          owner: 'cases',
        },
      ];

      const query = BulkCreateAttachmentsRequestRtV2.decode(v1Requests);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: v1Requests,
      });
    });

    it('accepts array of v2 attachment requests', () => {
      const v2Requests = [
        {
          type: 'lens',
          attachmentId: 'attachment-1',
          data: {
            attributes: {
              title: 'First Visualization',
            },
          },
        },
        {
          type: 'lens',
          attachmentId: 'attachment-2',
          data: {
            attributes: {
              title: 'Second Visualization',
            },
          },
        },
      ];

      const query = BulkCreateAttachmentsRequestRtV2.decode(v2Requests);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: v2Requests,
      });
    });

    it('accepts mixed array of v1 and v2 attachment requests', () => {
      const mixedRequests = [
        {
          comment: 'This is a comment',
          type: AttachmentType.user,
          owner: 'cases',
        },
        {
          type: 'lens',
          attachmentId: 'attachment-123',
          data: {
            attributes: {
              title: 'My Visualization',
            },
          },
          metadata: {
            description: 'A test visualization',
          },
        },
      ];

      const query = BulkCreateAttachmentsRequestRtV2.decode(mixedRequests);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: mixedRequests,
      });
    });

    it('removes foo:bar attributes from requests in array', () => {
      const requestsWithExtraFields = [
        {
          comment: 'This is a comment',
          type: AttachmentType.user,
          owner: 'cases',
          foo: 'bar',
        },
        {
          type: 'user',
          attachmentId: 'attachment-123',
          data: {
            content: 'My comment',
          },
          foo: 'bar',
        },
      ];

      const query = BulkCreateAttachmentsRequestRtV2.decode(requestsWithExtraFields);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [
          {
            comment: 'This is a comment',
            type: AttachmentType.user,
            owner: 'cases',
          },
          {
            type: 'user',
            attachmentId: 'attachment-123',
            data: {
              content: 'My comment',
            },
          },
        ],
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UnifiedAttachmentPayloadRt,
  UnifiedAttachmentAttributesRt,
  UnifiedAttachmentRt,
  AttachmentRtV2,
} from './v2';
import { AttachmentType } from './v1';

describe('Unified Attachments', () => {
  describe('UnifiedAttachmentPayloadRt', () => {
    const defaultRequest = {
      type: 'lens',
      attachmentId: 'attachment-123',
      owner: 'securitySolution',
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

    it('has expected attributes in request', () => {
      const query = UnifiedAttachmentPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UnifiedAttachmentPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('accepts null data', () => {
      const requestWithNullData = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
        data: null,
        metadata: null,
      };

      const query = UnifiedAttachmentPayloadRt.decode(requestWithNullData);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: requestWithNullData,
      });
    });

    it('accepts request with only data', () => {
      const requestWithoutAttachmentId = {
        type: 'user',
        owner: 'securitySolution',
        data: {
          content: 'My comment',
        },
      };

      const query = UnifiedAttachmentPayloadRt.decode(requestWithoutAttachmentId);
      expect(query).toStrictEqual({
        _tag: 'Right',
        right: requestWithoutAttachmentId,
      });
    });

    it('accepts request with only attachmentId', () => {
      const requestWithOnlyAttachmentId = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
      };

      const query = UnifiedAttachmentPayloadRt.decode(requestWithOnlyAttachmentId);

      expect(query._tag).toBe('Right');
      if (query._tag === 'Right') {
        expect(query.right).toMatchObject(requestWithOnlyAttachmentId);
        expect(query.right).not.toHaveProperty('metadata');
      }
    });

    it('accepts request with attachmentId and metadata', () => {
      const requestWithAttachmentIdAndMetadata = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
        metadata: {
          description: 'A test visualization',
        },
      };

      const query = UnifiedAttachmentPayloadRt.decode(requestWithAttachmentIdAndMetadata);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: requestWithAttachmentIdAndMetadata,
      });
    });
    it('accepts request without metadata', () => {
      const requestWithoutMetadata = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
        data: {
          attributes: {
            title: 'My Visualization',
          },
        },
      };

      const query = UnifiedAttachmentPayloadRt.decode(requestWithoutMetadata);

      expect(query._tag).toBe('Right');
      if (query._tag === 'Right') {
        expect(query.right).toMatchObject({
          type: 'lens',
          attachmentId: 'attachment-123',
          owner: 'securitySolution',
          data: {
            attributes: {
              title: 'My Visualization',
            },
          },
        });
        // metadata should not be present when not provided
        expect(query.right).not.toHaveProperty('metadata');
      }
    });

    it('rejects request with neither attachmentId nor data', () => {
      const requestWithOnlyType = {
        type: 'lens',
        owner: 'securitySolution',
      };

      const query = UnifiedAttachmentPayloadRt.decode(requestWithOnlyType);

      expect(query._tag).toBe('Left');
    });
  });

  describe('UnifiedAttachmentAttributesRt', () => {
    const defaultRequest = {
      type: 'lens',
      attachmentId: 'attachment-123',
      owner: 'securitySolution',
      data: {
        attributes: {
          title: 'My Visualization',
        },
      },
      metadata: {
        description: 'A test visualization',
      },
      created_at: '2019-11-25T22:32:30.608Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      updated_at: null,
      updated_by: null,
      pushed_at: null,
      pushed_by: null,
    };

    it('has expected attributes in request', () => {
      const query = UnifiedAttachmentAttributesRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UnifiedAttachmentAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('accepts request with only attachmentId', () => {
      const requestWithOnlyAttachmentId = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
      };

      const query = UnifiedAttachmentAttributesRt.decode(requestWithOnlyAttachmentId);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: requestWithOnlyAttachmentId,
      });
    });

    it('accepts request with only data', () => {
      const requestWithOnlyData = {
        type: 'user',
        data: {
          content: 'My comment',
        },
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
      };

      const query = UnifiedAttachmentAttributesRt.decode(requestWithOnlyData);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: requestWithOnlyData,
      });
    });

    it('rejects request with neither attachmentId nor data', () => {
      const requestWithoutRequired = {
        type: 'lens',
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
      };

      const query = UnifiedAttachmentAttributesRt.decode(requestWithoutRequired);

      expect(query._tag).toBe('Left');
    });
  });

  describe('UnifiedAttachmentRt', () => {
    const defaultRequest = {
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
      owner: 'securitySolution',
      created_at: '2019-11-25T22:32:30.608Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      updated_at: null,
      updated_by: null,
      pushed_at: null,
      pushed_by: null,
      id: 'attachment-id-123',
      version: 'WzEwMCwxXQ==',
    };

    it('has expected attributes in request', () => {
      const query = UnifiedAttachmentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UnifiedAttachmentRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('accepts request with only attachmentId', () => {
      const requestWithOnlyAttachmentId = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
        id: 'attachment-id-123',
        version: 'WzEwMCwxXQ==',
      };

      const query = UnifiedAttachmentRt.decode(requestWithOnlyAttachmentId);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: requestWithOnlyAttachmentId,
      });
    });

    it('accepts request with only data', () => {
      const requestWithOnlyData = {
        type: 'user',
        data: {
          content: 'My comment',
        },
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
        id: 'attachment-id-123',
        version: 'WzEwMCwxXQ==',
      };

      const query = UnifiedAttachmentRt.decode(requestWithOnlyData);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: requestWithOnlyData,
      });
    });

    it('rejects request with neither attachmentId nor data', () => {
      const requestWithoutRequired = {
        type: 'lens',
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
        id: 'attachment-id-123',
        version: 'WzEwMCwxXQ==',
      };

      const query = UnifiedAttachmentRt.decode(requestWithoutRequired);

      expect(query._tag).toBe('Left');
    });
  });

  describe('AttachmentRtV2', () => {
    it('accepts UnifiedAttachmentRt', () => {
      const unifiedAttachment = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
        id: 'attachment-id-123',
        version: 'WzEwMCwxXQ==',
      };

      const query = AttachmentRtV2.decode(unifiedAttachment);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: unifiedAttachment,
      });
    });

    it('accepts AttachmentRt (v1)', () => {
      const v1Attachment = {
        type: AttachmentType.user,
        comment: 'This is a comment',
        owner: 'cases',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
        id: 'attachment-id-123',
        version: 'WzEwMCwxXQ==',
      };

      const query = AttachmentRtV2.decode(v1Attachment);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: v1Attachment,
      });
    });
  });
});

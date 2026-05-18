/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UnifiedAttachmentPayloadSchema,
  UnifiedAttachmentAttributesSchema,
  UnifiedAttachmentSchema,
  AttachmentSchemaV2,
  DocumentAttachmentAttributesSchemaV2,
} from './v2';
import { AttachmentType } from './v1';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
} from '../../../constants/attachments';

describe('Unified Attachments', () => {
  describe('UnifiedAttachmentPayloadSchema', () => {
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
      const result = UnifiedAttachmentPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = UnifiedAttachmentPayloadSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('accepts null data', () => {
      const requestWithNullData = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
        data: null,
        metadata: null,
      };

      const result = UnifiedAttachmentPayloadSchema.safeParse(requestWithNullData);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithNullData);
    });

    it('accepts request with only data', () => {
      const requestWithoutAttachmentId = {
        type: 'user',
        owner: 'securitySolution',
        data: {
          content: 'My comment',
        },
      };

      const result = UnifiedAttachmentPayloadSchema.safeParse(requestWithoutAttachmentId);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithoutAttachmentId);
    });

    it('accepts request with only attachmentId', () => {
      const requestWithOnlyAttachmentId = {
        type: 'lens',
        attachmentId: 'attachment-123',
        owner: 'securitySolution',
      };

      const result = UnifiedAttachmentPayloadSchema.safeParse(requestWithOnlyAttachmentId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(requestWithOnlyAttachmentId);
        expect(result.data).not.toHaveProperty('metadata');
      }
    });

    it('accepts reference request with attachmentId as string array', () => {
      const requestWithAttachmentIdArray = {
        type: 'lens',
        attachmentId: ['a', 'b'],
        owner: 'securitySolution',
      };

      const result = UnifiedAttachmentPayloadSchema.safeParse(requestWithAttachmentIdArray);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(requestWithAttachmentIdArray);
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

      const result = UnifiedAttachmentPayloadSchema.safeParse(requestWithAttachmentIdAndMetadata);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithAttachmentIdAndMetadata);
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

      const result = UnifiedAttachmentPayloadSchema.safeParse(requestWithoutMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          type: 'lens',
          attachmentId: 'attachment-123',
          owner: 'securitySolution',
          data: {
            attributes: {
              title: 'My Visualization',
            },
          },
        });
        expect(result.data).not.toHaveProperty('metadata');
      }
    });

    it('rejects request with neither attachmentId nor data', () => {
      const requestWithOnlyType = {
        type: 'lens',
        owner: 'securitySolution',
      };

      const result = UnifiedAttachmentPayloadSchema.safeParse(requestWithOnlyType);
      expect(result.success).toBe(false);
    });
  });

  describe('UnifiedAttachmentAttributesSchema', () => {
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
      const result = UnifiedAttachmentAttributesSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = UnifiedAttachmentAttributesSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
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

      const result = UnifiedAttachmentAttributesSchema.safeParse(requestWithOnlyAttachmentId);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithOnlyAttachmentId);
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

      const result = UnifiedAttachmentAttributesSchema.safeParse(requestWithOnlyData);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithOnlyData);
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

      const result = UnifiedAttachmentAttributesSchema.safeParse(requestWithoutRequired);
      expect(result.success).toBe(false);
    });
  });

  describe('UnifiedAttachmentSchema', () => {
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
      const result = UnifiedAttachmentSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = UnifiedAttachmentSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
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

      const result = UnifiedAttachmentSchema.safeParse(requestWithOnlyAttachmentId);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithOnlyAttachmentId);
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

      const result = UnifiedAttachmentSchema.safeParse(requestWithOnlyData);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithOnlyData);
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

      const result = UnifiedAttachmentSchema.safeParse(requestWithoutRequired);
      expect(result.success).toBe(false);
    });
  });

  describe('AttachmentSchemaV2', () => {
    it('accepts UnifiedAttachmentSchema', () => {
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

      const result = AttachmentSchemaV2.safeParse(unifiedAttachment);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(unifiedAttachment);
    });

    it('accepts AttachmentSchema (v1)', () => {
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

      const result = AttachmentSchemaV2.safeParse(v1Attachment);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(v1Attachment);
    });
  });

  describe('DocumentAttachmentAttributesSchemaV2', () => {
    it('accepts legacy event attributes', () => {
      const legacyEvent = {
        type: AttachmentType.event,
        eventId: 'event-1',
        index: 'logs-1',
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: { full_name: 'elastic', email: 'testemail@elastic.co', username: 'elastic' },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
      };

      const result = DocumentAttachmentAttributesSchemaV2.safeParse(legacyEvent);
      expect(result.success).toBe(true);
    });

    it('accepts unified security.event attributes', () => {
      const unifiedEvent = {
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        attachmentId: ['event-1', 'event-2'],
        metadata: { index: ['logs-1', 'logs-2'] },
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: { full_name: 'elastic', email: 'testemail@elastic.co', username: 'elastic' },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
      };

      const result = DocumentAttachmentAttributesSchemaV2.safeParse(unifiedEvent);
      expect(result.success).toBe(true);
    });

    it('accepts unified security.alert attributes with rule metadata', () => {
      const unifiedAlert = {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1'],
        metadata: {
          index: ['alerts-index-1'],
          rule: { id: 'rule-id-1', name: 'rule-name-1' },
        },
        owner: 'securitySolution',
        created_at: '2019-11-25T22:32:30.608Z',
        created_by: { full_name: 'elastic', email: 'testemail@elastic.co', username: 'elastic' },
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
      };

      const result = DocumentAttachmentAttributesSchemaV2.safeParse(unifiedAlert);
      expect(result.success).toBe(true);
    });
  });
});

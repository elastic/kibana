/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../attachment/v1';
import { UserActionTypes } from '../action/v1';
import { CommentUserActionPayloadSchema, CommentUserActionSchema } from './v1';

describe('Attachment', () => {
  describe('CommentUserActionPayloadSchema', () => {
    const defaultRequest = {
      comment: {
        comment: 'this is a sample comment',
        type: AttachmentType.user,
        owner: 'cases',
      },
    };

    it('has expected attributes in request', () => {
      const result = CommentUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CommentUserActionPayloadSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from comment', () => {
      const result = CommentUserActionPayloadSchema.safeParse({
        comment: { ...defaultRequest.comment, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('accepts v2 unified format (comment payload with type and data)', () => {
      const v2UnifiedRequest = {
        comment: {
          type: 'comment',
          data: { content: 'unified comment content' },
          owner: 'cases',
        },
      };
      const result = CommentUserActionPayloadSchema.safeParse(v2UnifiedRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.comment).toHaveProperty('type', 'comment');
        expect(result.data.comment).toHaveProperty('data', { content: 'unified comment content' });
      }
    });

    it('accepts v2 unified format with attachment id', () => {
      const v2UnifiedRequest = {
        comment: {
          type: 'lens',
          attachmentId: 'attachment-123',
          owner: 'cases',
          metadata: {
            description: 'A test visualization',
          },
        },
      };
      const result = CommentUserActionPayloadSchema.safeParse(v2UnifiedRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.comment).toEqual(v2UnifiedRequest.comment);
      }
    });
  });

  describe('CommentUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.comment,
      payload: {
        comment: {
          comment: 'this is a sample comment',
          type: AttachmentType.user,
          owner: 'cases',
        },
      },
    };

    it('has expected attributes in request', () => {
      const result = CommentUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CommentUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = CommentUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('accepts v2 shape in payload', () => {
      const v2PayloadRequest = {
        type: UserActionTypes.comment,
        payload: {
          comment: {
            type: 'comment',
            data: { content: 'v2 unified comment' },
            owner: 'cases',
          },
        },
      };
      const result = CommentUserActionSchema.safeParse(v2PayloadRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(UserActionTypes.comment);
        expect(result.data.payload.comment).toHaveProperty('type', 'comment');
        expect(result.data.payload.comment).toHaveProperty('data', {
          content: 'v2 unified comment',
        });
      }
    });
  });
});

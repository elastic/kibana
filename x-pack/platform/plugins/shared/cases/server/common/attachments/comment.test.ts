/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../common/types/domain';
import type { AttachmentAttributes } from '../../../common/types/domain/attachment/v1';
import {
  isLegacyPayloadCommentAttachment,
  isUnifiedPayloadCommentAttachment,
  toUnifiedPayloadCommentAttachment,
  toLegacyPayloadCommentAttachment,
  hasCommentField,
  transformCommentPatchToUnifiedPatch,
  commentAttachmentTransformer,
  extractCommentContent,
} from './comment';

describe('common/attachments/comment', () => {
  describe('isLegacyPayloadCommentAttachment', () => {
    it('returns true for legacy user comment with comment and owner', () => {
      expect(
        isLegacyPayloadCommentAttachment({
          type: AttachmentType.user,
          comment: 'hello',
          owner: 'cases',
        })
      ).toBe(true);
    });

    it('returns false for unified comment format', () => {
      expect(
        isLegacyPayloadCommentAttachment({
          type: 'comment',
          data: { content: 'hello' },
        })
      ).toBe(false);
    });

    it('returns false when comment is missing', () => {
      expect(
        isLegacyPayloadCommentAttachment({
          type: AttachmentType.user,
          owner: 'cases',
        } as never)
      ).toBe(false);
    });

    it('returns false when owner is missing', () => {
      expect(
        isLegacyPayloadCommentAttachment({
          type: AttachmentType.user,
          comment: 'hello',
        } as never)
      ).toBe(false);
    });
  });

  describe('isUnifiedPayloadCommentAttachment', () => {
    it('returns true for unified comment with data.content', () => {
      expect(
        isUnifiedPayloadCommentAttachment({
          type: 'comment',
          data: { content: 'hello' },
        })
      ).toBe(true);
    });

    it('returns false for legacy user comment', () => {
      expect(
        isUnifiedPayloadCommentAttachment({
          type: AttachmentType.user,
          comment: 'hello',
          owner: 'cases',
        })
      ).toBe(false);
    });

    it('returns false when data.content is missing', () => {
      expect(
        isUnifiedPayloadCommentAttachment({
          type: 'comment',
          data: {},
        } as never)
      ).toBe(false);
    });
  });

  describe('toUnifiedPayloadCommentAttachment', () => {
    it('transforms legacy user comment to unified format', () => {
      const result = toUnifiedPayloadCommentAttachment({
        type: AttachmentType.user,
        comment: 'legacy content',
        owner: 'securitySolution',
      });
      expect(result).toEqual({
        type: 'comment',
        data: { content: 'legacy content' },
      });
    });

    it('throws for invalid legacy payload', () => {
      expect(() =>
        toUnifiedPayloadCommentAttachment({
          type: 'comment',
          data: { content: 'x' },
        } as never)
      ).toThrow('Invalid legacy payload comment attachment');
    });
  });

  describe('toLegacyPayloadCommentAttachment', () => {
    it('transforms unified comment to legacy format with provided owner', () => {
      const result = toLegacyPayloadCommentAttachment(
        { type: 'comment', data: { content: 'unified content' } },
        'securitySolution'
      );
      expect(result).toEqual({
        type: AttachmentType.user,
        comment: 'unified content',
        owner: 'securitySolution',
      });
    });

    it('throws when content is empty', () => {
      expect(() =>
        toLegacyPayloadCommentAttachment({ type: 'comment', data: { content: '' } }, 'owner')
      ).toThrow('Comment content is required for comment attachments');
    });
  });

  describe('hasCommentField', () => {
    it('returns true for object with string comment', () => {
      expect(hasCommentField({ comment: 'hello' })).toBe(true);
      expect(hasCommentField({ comment: 'hello', type: 'user' })).toBe(true);
    });

    it('returns false for object without comment', () => {
      expect(hasCommentField({ type: 'user' })).toBe(false);
    });

    it('returns false for null or non-object', () => {
      expect(hasCommentField(null)).toBe(false);
      expect(hasCommentField(undefined)).toBe(false);
      expect(hasCommentField('string')).toBe(false);
    });

    it('returns false when comment is not a string', () => {
      expect(hasCommentField({ comment: 123 })).toBe(false);
    });
  });

  describe('transformCommentPatchToUnifiedPatch', () => {
    it('transforms patch with comment to data.content shape', () => {
      const patch = { type: 'user', comment: 'hello', owner: 'test' };
      expect(transformCommentPatchToUnifiedPatch(patch)).toEqual({
        type: 'user',
        owner: 'test',
        data: { content: 'hello' },
      });
    });

    it('returns patch unchanged when no comment field', () => {
      const patch = { type: 'alert', alertId: '1' };
      expect(transformCommentPatchToUnifiedPatch(patch)).toEqual(patch);
    });
  });

  describe('commentAttachmentTransformer', () => {
    const legacyUserComment: AttachmentAttributes = {
      type: AttachmentType.user,
      comment: 'legacy content',
      owner: 'securitySolution',
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: { username: 'u', full_name: null, email: null },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    const unifiedComment = {
      type: 'comment',
      data: { content: 'unified content' },
      metadata: { owner: 'securitySolution' },
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: { username: 'u', full_name: null, email: null },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    describe('toUnifiedSchema', () => {
      it('transforms legacy user comment to unified schema', () => {
        const result = commentAttachmentTransformer.toUnifiedSchema(
          legacyUserComment
        ) as typeof unifiedComment;
        expect(result.type).toBe('comment');
        expect(result.data).toEqual({ content: 'legacy content' });
        expect(result.created_at).toBe(legacyUserComment.created_at);
        expect(result.created_by).toEqual(legacyUserComment.created_by);
      });

      it('returns unified attributes unchanged when already new schema', () => {
        const result = commentAttachmentTransformer.toUnifiedSchema(
          unifiedComment
        ) as typeof unifiedComment;
        expect(result).toEqual(unifiedComment);
      });
    });

    describe('toLegacySchema', () => {
      it('transforms unified comment to legacy schema', () => {
        const result = commentAttachmentTransformer.toLegacySchema(unifiedComment) as {
          type: string;
          comment: string;
          owner: string;
        };
        expect(result.type).toBe('user');
        expect(result.comment).toBe('unified content');
        expect(result.owner).toBe('securitySolution');
      });

      it('uses owner argument when metadata.owner is missing', () => {
        const unifiedNoOwner = { ...unifiedComment, metadata: {} };
        const result = commentAttachmentTransformer.toLegacySchema(
          unifiedNoOwner,
          'fallback-owner'
        ) as { owner: string };
        expect(result.owner).toBe('fallback-owner');
      });

      it('returns legacy attributes unchanged when already old schema', () => {
        const result = commentAttachmentTransformer.toLegacySchema(legacyUserComment) as {
          type: string;
          comment: string;
        };
        expect(result.type).toBe('user');
        expect(result.comment).toBe('legacy content');
      });
    });

    describe('isType', () => {
      it('returns true for legacy user comment', () => {
        expect(commentAttachmentTransformer.isType(legacyUserComment as never)).toBe(true);
      });

      it('returns true for unified comment', () => {
        expect(commentAttachmentTransformer.isType(unifiedComment as never)).toBe(true);
      });

      it('returns false for alert attachment', () => {
        expect(commentAttachmentTransformer.isType({ type: AttachmentType.alert } as never)).toBe(
          false
        );
      });
    });

    describe('isUnifiedType', () => {
      it('returns true for unified comment', () => {
        expect(commentAttachmentTransformer.isUnifiedType(unifiedComment)).toBe(true);
      });

      it('returns false for legacy user comment', () => {
        expect(commentAttachmentTransformer.isUnifiedType(legacyUserComment)).toBe(false);
      });
    });

    describe('isLegacyType', () => {
      it('returns true for legacy user comment', () => {
        expect(commentAttachmentTransformer.isLegacyType(legacyUserComment)).toBe(true);
      });

      it('returns false for unified comment', () => {
        expect(commentAttachmentTransformer.isLegacyType(unifiedComment)).toBe(false);
      });
    });
  });

  describe('extractCommentContent', () => {
    it('extracts content from legacy user comment', () => {
      const attrs = {
        type: AttachmentType.user,
        comment: 'hello world',
        owner: 'test',
      } as never;
      expect(extractCommentContent(attrs)).toBe('hello world');
    });

    it('extracts content from unified comment', () => {
      const attrs = {
        type: 'comment',
        data: { content: 'unified text' },
      } as never;
      expect(extractCommentContent(attrs)).toBe('unified text');
    });

    it('throws when attachment is not a comment attachment', () => {
      expect(() => extractCommentContent({ type: AttachmentType.alert } as never)).toThrow(
        'Attachment is not a comment attachment'
      );
    });
  });
});

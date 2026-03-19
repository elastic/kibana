/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../common/types/domain';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { getAttachmentTypeFromAttributes, getAttachmentTypeTransformers } from '.';
import { commentAttachmentTransformer } from './comment';

describe('common/attachments', () => {
  describe('getAttachmentTypeFromAttributes', () => {
    it('throws for null', () => {
      expect(() => getAttachmentTypeFromAttributes(null)).toThrow(
        'Invalid attributes: expected non-null object'
      );
    });

    it('throws for non-object', () => {
      expect(() => getAttachmentTypeFromAttributes('string')).toThrow(
        'Invalid attributes: expected non-null object'
      );
      expect(() => getAttachmentTypeFromAttributes(42)).toThrow(
        'Invalid attributes: expected non-null object'
      );
    });

    it('returns type when attributes have string type', () => {
      expect(getAttachmentTypeFromAttributes({ type: 'comment' })).toBe('comment');
      expect(getAttachmentTypeFromAttributes({ type: AttachmentType.alert })).toBe(
        AttachmentType.alert
      );
    });

    it('returns AttachmentType.user when attributes have comment field', () => {
      expect(getAttachmentTypeFromAttributes({ comment: 'hello', type: 'user' })).toBe(
        AttachmentType.user
      );
    });

    it('throws when attributes have no recognizable attachment type', () => {
      expect(() => getAttachmentTypeFromAttributes({ foo: 'bar' })).toThrow(
        'Invalid attributes: missing attachment type'
      );
    });

    it('throws when type is not a string', () => {
      expect(() => getAttachmentTypeFromAttributes({ type: 1 })).toThrow(
        'Invalid attributes: missing attachment type'
      );
      expect(() =>
        getAttachmentTypeFromAttributes({
          pushed_at: '2020-01-01T00:00:00.000Z',
          pushed_by: { username: 'elastic', full_name: null, email: null },
        })
      ).toThrow('Invalid attributes: missing attachment type');
    });
  });

  describe('getAttachmentTypeTransformers', () => {
    it('returns comment transformer correctly', () => {
      const transformer1 = getAttachmentTypeTransformers(COMMENT_ATTACHMENT_TYPE);
      expect(transformer1).toBe(commentAttachmentTransformer);

      const transformer2 = getAttachmentTypeTransformers('comment');
      expect(transformer2).toBe(commentAttachmentTransformer);

      const transformer3 = getAttachmentTypeTransformers(AttachmentType.user);
      expect(transformer3).toBe(commentAttachmentTransformer);

      const transformer4 = getAttachmentTypeTransformers('user');
      expect(transformer4).toBe(commentAttachmentTransformer);
    });

    it('returns pass-through transformer for other types', () => {
      const transformer = getAttachmentTypeTransformers(AttachmentType.alert);
      expect(transformer).not.toBe(commentAttachmentTransformer);
      expect(transformer.isType({ type: AttachmentType.alert } as never)).toBe(false);
    });
  });
});

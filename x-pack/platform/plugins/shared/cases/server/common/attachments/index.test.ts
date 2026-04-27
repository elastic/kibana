/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../common/types/domain';
import {
  COMMENT_ATTACHMENT_TYPE,
  LEGACY_LENS_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { getAttachmentTypeFromAttributes, getAttachmentTypeTransformers } from '.';
import { commentAttachmentTransformer } from './comment';
import { alertAttachmentTransformer } from './alert';
import { passThroughTransformer } from './base';

const owner = 'cases';

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

    it('returns persistableStateAttachmentTypeId for persistable state attachments', () => {
      expect(
        getAttachmentTypeFromAttributes({
          type: AttachmentType.persistableState,
          persistableStateAttachmentTypeId: LEGACY_LENS_ATTACHMENT_TYPE,
        })
      ).toBe(LEGACY_LENS_ATTACHMENT_TYPE);
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
      const transformer1 = getAttachmentTypeTransformers(COMMENT_ATTACHMENT_TYPE, owner);
      expect(transformer1).toBe(commentAttachmentTransformer);

      const transformer2 = getAttachmentTypeTransformers('comment', owner);
      expect(transformer2).toBe(commentAttachmentTransformer);

      const transformer3 = getAttachmentTypeTransformers(AttachmentType.user, owner);
      expect(transformer3).toBe(commentAttachmentTransformer);

      const transformer4 = getAttachmentTypeTransformers('user', owner);
      expect(transformer4).toBe(commentAttachmentTransformer);
    });

    it('returns alert transformer for legacy and unified alert types', () => {
      const legacyAlertTransformer = getAttachmentTypeTransformers(AttachmentType.alert, owner);
      expect(legacyAlertTransformer).toBe(alertAttachmentTransformer);

      const unifiedAlertTransformer = getAttachmentTypeTransformers('stack.alert', owner);
      expect(unifiedAlertTransformer).toBe(alertAttachmentTransformer);
    });

    it('returns event transformer for legacy and unified event types', () => {
      const legacyEventTransformer = getAttachmentTypeTransformers(
        AttachmentType.event,
        SECURITY_SOLUTION_OWNER
      );
      expect(
        legacyEventTransformer.isType({
          type: AttachmentType.event,
          eventId: 'event-1',
          index: 'index-1',
          owner: SECURITY_SOLUTION_OWNER,
        } as never)
      ).toBe(true);

      const unifiedEventTransformer = getAttachmentTypeTransformers(
        'security.event',
        SECURITY_SOLUTION_OWNER
      );
      expect(
        unifiedEventTransformer.isType({
          type: 'security.event',
          attachmentId: 'event-1',
          metadata: { index: 'index-1' },
          owner: SECURITY_SOLUTION_OWNER,
        } as never)
      ).toBe(true);
    });

    it('returns pass-through transformer for unrecognized types', () => {
      const transformer = getAttachmentTypeTransformers('unknown.type', owner);
      expect(transformer).toBe(passThroughTransformer);
    });

    it('returns configured persistable state transformer for known visualization types', () => {
      const lensTransformer = getAttachmentTypeTransformers(LENS_ATTACHMENT_TYPE, owner);
      expect(lensTransformer).not.toBe(commentAttachmentTransformer);
      expect(
        lensTransformer.isLegacyType({
          type: AttachmentType.persistableState,
          persistableStateAttachmentTypeId: LEGACY_LENS_ATTACHMENT_TYPE,
          persistableStateAttachmentState: {},
          owner: 'securitySolution',
        })
      ).toBe(true);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { AttachmentType } from '../../../common/types/domain';
import { SECURITY_EVENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { UnifiedReferenceAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import { eventAttachmentTransformer } from './event';

describe('event attachment transformer', () => {
  describe('toUnifiedPayload', () => {
    it('converts a legacy payload to unified payload (singular ids)', () => {
      const payload = eventAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.event,
        owner: SECURITY_SOLUTION_OWNER,
        eventId: 'event-1',
        index: 'index-1',
      });

      expect(payload).toEqual({
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        attachmentId: 'event-1',
        metadata: {
          index: 'index-1',
        },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('preserves legacy event id and index arrays on the unified payload', () => {
      const payload = eventAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.event,
        owner: SECURITY_SOLUTION_OWNER,
        eventId: ['event-1', 'event-2'],
        index: ['index-1', 'index-2'],
      });

      expect(payload).toEqual({
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        attachmentId: ['event-1', 'event-2'],
        metadata: {
          index: ['index-1', 'index-2'],
        },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('normalizes single-item arrays to scalar values', () => {
      const payload = eventAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.event,
        owner: SECURITY_SOLUTION_OWNER,
        eventId: ['event-1'],
        index: ['index-1'],
      });

      expect(payload).toEqual({
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        attachmentId: 'event-1',
        metadata: {
          index: 'index-1',
        },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });
  });

  describe('toUnifiedSchema', () => {
    it('maps legacy persisted attributes with event arrays to unified shape', () => {
      const attrs = eventAttachmentTransformer.toUnifiedSchema({
        type: AttachmentType.event,
        owner: SECURITY_SOLUTION_OWNER,
        eventId: ['a', 'b'],
        index: ['i1', 'i2'],
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: {
          username: 'u',
          full_name: null,
          email: null,
          profile_uid: undefined,
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      });

      expect(attrs).toMatchObject({
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        attachmentId: ['a', 'b'],
        metadata: { index: ['i1', 'i2'] },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });
  });

  describe('toLegacyPayload', () => {
    it('throws when metadata.index is missing', () => {
      expect(() =>
        eventAttachmentTransformer.toLegacyPayload({
          type: SECURITY_EVENT_ATTACHMENT_TYPE,
          owner: SECURITY_SOLUTION_OWNER,
          attachmentId: 'event-1',
        } as UnifiedReferenceAttachmentPayload)
      ).toThrow('metadata.index is required');
    });
  });
});

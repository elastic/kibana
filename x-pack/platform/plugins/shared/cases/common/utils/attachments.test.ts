/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentAttributes } from '../types/domain';
import { AttachmentType } from '../types/domain';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
} from './attachments';

describe('attachments utils', () => {
  describe('isCommentRequestTypeExternalReference', () => {
    const externalReferenceAttachment = {
      type: AttachmentType.externalReference as const,
    } as AttachmentAttributes;

    const commentTypeWithoutAlert = Object.values(AttachmentType).filter(
      (type) => type !== AttachmentType.externalReference
    );

    it('returns false for type: externalReference', () => {
      expect(isCommentRequestTypeExternalReference(externalReferenceAttachment)).toBe(true);
    });

    it.each(commentTypeWithoutAlert)('returns false for type: %s', (type) => {
      const attachment = {
        type,
      } as AttachmentAttributes;

      expect(isCommentRequestTypeExternalReference(attachment)).toBe(false);
    });
  });

  describe('isCommentRequestTypePersistableState', () => {
    const persistableStateAttachment = {
      type: AttachmentType.persistableState as const,
    } as AttachmentAttributes;

    const commentTypeWithoutAlert = Object.values(AttachmentType).filter(
      (type) => type !== AttachmentType.persistableState
    );

    it('returns false for type: persistableState', () => {
      expect(isCommentRequestTypePersistableState(persistableStateAttachment)).toBe(true);
    });

    it.each(commentTypeWithoutAlert)('returns false for type: %s', (type) => {
      const attachment = {
        type,
      } as AttachmentAttributes;

      expect(isCommentRequestTypePersistableState(attachment)).toBe(false);
    });
  });
});

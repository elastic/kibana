/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LEGACY_LENS_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  OWNER_TO_PREFIX_MAP,
  UNIFIED_ATTACHMENT_TYPES,
} from '../../constants/attachments';
import { AttachmentType } from '../../types/domain';
import { SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER, GENERAL_CASES_OWNER } from '../../constants';
import {
  isMigratedAttachmentType,
  isPersistableType,
  toUnifiedAttachmentType,
} from './migration_utils';

const owner = SECURITY_SOLUTION_OWNER;

describe('migration_utils', () => {
  describe('isMigratedAttachmentType', () => {
    it('is true for legacy migrated attachment types', () => {
      expect(isMigratedAttachmentType(AttachmentType.user, owner)).toBe(true);
      expect(isMigratedAttachmentType('user', owner)).toBe(true);
      expect(isMigratedAttachmentType('event', owner)).toBe(true);
    });

    it('is true for legacy alert attachment type', () => {
      expect(isMigratedAttachmentType(AttachmentType.alert, owner)).toBe(true);
      expect(isMigratedAttachmentType(AttachmentType.alert, OBSERVABILITY_OWNER)).toBe(true);
      expect(isMigratedAttachmentType(AttachmentType.alert, GENERAL_CASES_OWNER)).toBe(true);
    });

    it('is true for owner-scoped unified attachment types', () => {
      expect(isMigratedAttachmentType('comment', owner)).toBe(true);
      expect(isMigratedAttachmentType('security.event', 'security')).toBe(true);
      expect(isMigratedAttachmentType('security.alert', owner)).toBe(true);
      expect(isMigratedAttachmentType('observability.alert', OBSERVABILITY_OWNER)).toBe(true);
      expect(isMigratedAttachmentType('stack.alert', GENERAL_CASES_OWNER)).toBe(true);
    });
    it('is true for legacy and unified Lens persistable subtype ids', () => {
      expect(isMigratedAttachmentType(LEGACY_LENS_ATTACHMENT_TYPE, owner)).toBe(true);
      expect(isMigratedAttachmentType(LENS_ATTACHMENT_TYPE, owner)).toBe(true);
    });

    it('is false for non-migrated attachment types', () => {
      expect(isMigratedAttachmentType('custom', owner)).toBe(false);
    });
  });

  describe('toUnifiedAttachmentType', () => {
    it('does not produce undefined prefixes for unknown owners', () => {
      expect(toUnifiedAttachmentType(AttachmentType.event, 'unknownOwner')).toBe(
        AttachmentType.event
      );
      expect(toUnifiedAttachmentType(AttachmentType.alert, 'unknownOwner')).toBe(
        AttachmentType.alert
      );
    });

    it('produces owner-scoped alert types', () => {
      expect(toUnifiedAttachmentType('alert', SECURITY_SOLUTION_OWNER)).toBe('security.alert');
      expect(toUnifiedAttachmentType('alert', OBSERVABILITY_OWNER)).toBe('observability.alert');
      expect(toUnifiedAttachmentType('alert', GENERAL_CASES_OWNER)).toBe('stack.alert');
    });

    it('produces owner-scoped event types', () => {
      expect(toUnifiedAttachmentType('event', SECURITY_SOLUTION_OWNER)).toBe('security.event');
    });

    it.each(Object.keys(OWNER_TO_PREFIX_MAP))(
      'maps legacy alert to a registered unified attachment type for owner "%s"',
      (ownerKey) => {
        const unifiedType = toUnifiedAttachmentType(AttachmentType.alert, ownerKey);
        expect(UNIFIED_ATTACHMENT_TYPES.has(unifiedType)).toBe(true);
      }
    );
  });

  describe('isPersistableType', () => {
    it('is true for Lens legacy and unified subtype ids', () => {
      expect(isPersistableType(LEGACY_LENS_ATTACHMENT_TYPE)).toBe(true);
      expect(isPersistableType(LENS_ATTACHMENT_TYPE)).toBe(true);
    });

    it('is false for unrelated persistable subtype ids', () => {
      expect(isPersistableType('.test')).toBe(false);
    });
  });
});

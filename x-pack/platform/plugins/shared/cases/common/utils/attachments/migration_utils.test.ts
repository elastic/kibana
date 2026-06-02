/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_ATTACHMENT_TYPE,
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  LEGACY_ACTIONS_TYPE,
  INDICATOR_ATTACHMENT_TYPE,
  LEGACY_LENS_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  MAP_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  OSQUERY_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_TIMELINE_ATTACHMENT_TYPE,
} from '../../constants/attachments';
import { AttachmentType } from '../../types/domain';
import { SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER, GENERAL_CASES_OWNER } from '../../constants';
import {
  isMigratedAttachmentType,
  isPersistableType,
  isUnifiedOnlyAttachmentType,
  toLegacyAttachmentType,
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
    });
  });

  describe('toUnifiedAttachmentType - legacy actions', () => {
    it('maps the legacy top-level `actions` type to security.endpoint', () => {
      expect(toUnifiedAttachmentType(LEGACY_ACTIONS_TYPE, owner)).toBe(
        SECURITY_ENDPOINT_ATTACHMENT_TYPE
      );
    });
  });

  describe('toLegacyAttachmentType', () => {
    it('maps the unified file type back to externalReference (top-level type)', () => {
      expect(toLegacyAttachmentType(FILE_ATTACHMENT_TYPE)).toBe(AttachmentType.externalReference);
    });

    it('maps the unified security.endpoint type back to externalReference (top-level type)', () => {
      expect(toLegacyAttachmentType(SECURITY_ENDPOINT_ATTACHMENT_TYPE)).toBe(
        AttachmentType.externalReference
      );
    });
  });

  describe('isMigratedAttachmentType - file & endpoint', () => {
    it('is true for the unified file type', () => {
      expect(isMigratedAttachmentType(FILE_ATTACHMENT_TYPE, owner)).toBe(true);
    });
  });

  describe('isMigratedAttachmentType - osquery', () => {
    it('is true for the unified osquery type', () => {
      expect(isMigratedAttachmentType(OSQUERY_ATTACHMENT_TYPE, owner)).toBe(true);
      expect(isMigratedAttachmentType(OSQUERY_ATTACHMENT_TYPE, OBSERVABILITY_OWNER)).toBe(true);
    });
  });

  describe('toLegacyAttachmentType - osquery', () => {
    it('maps the unified osquery type back to externalReference (top-level type)', () => {
      expect(toLegacyAttachmentType(OSQUERY_ATTACHMENT_TYPE)).toBe(
        AttachmentType.externalReference
      );
    });
  });

  describe('isMigratedAttachmentType - indicator', () => {
    it('is true for the unified indicator type', () => {
      expect(isMigratedAttachmentType(INDICATOR_ATTACHMENT_TYPE, owner)).toBe(true);
    });
  });

  describe('toLegacyAttachmentType - indicator', () => {
    it('maps the unified indicator type back to externalReference (top-level type)', () => {
      expect(toLegacyAttachmentType(INDICATOR_ATTACHMENT_TYPE)).toBe(
        AttachmentType.externalReference
      );
    });
  });

  describe('isUnifiedOnlyAttachmentType', () => {
    it('is true for unified types with no legacy equivalent', () => {
      expect(isUnifiedOnlyAttachmentType(SECURITY_TIMELINE_ATTACHMENT_TYPE)).toBe(true);
    });

    it('is false for unified types that map back to a legacy type', () => {
      expect(isUnifiedOnlyAttachmentType(SECURITY_ALERT_ATTACHMENT_TYPE)).toBe(false);
      expect(isUnifiedOnlyAttachmentType(FILE_ATTACHMENT_TYPE)).toBe(false);
      expect(isUnifiedOnlyAttachmentType(LENS_ATTACHMENT_TYPE)).toBe(false);
    });

    it('is false for legacy and unknown types', () => {
      expect(isUnifiedOnlyAttachmentType(AttachmentType.user)).toBe(false);
      expect(isUnifiedOnlyAttachmentType('something-custom')).toBe(false);
    });
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

  describe('isUnifiedOnlyAttachmentType', () => {
    it('is true for unified types with no legacy equivalent', () => {
      expect(isUnifiedOnlyAttachmentType(DASHBOARD_ATTACHMENT_TYPE)).toBe(true);
      expect(isUnifiedOnlyAttachmentType(MAP_ATTACHMENT_TYPE)).toBe(true);
      expect(isUnifiedOnlyAttachmentType(DISCOVER_SESSION_ATTACHMENT_TYPE)).toBe(true);
    });

    it('is false for unified types that map back to a legacy type', () => {
      expect(isUnifiedOnlyAttachmentType(SECURITY_ALERT_ATTACHMENT_TYPE)).toBe(false);
      expect(isUnifiedOnlyAttachmentType(FILE_ATTACHMENT_TYPE)).toBe(false);
      expect(isUnifiedOnlyAttachmentType(LENS_ATTACHMENT_TYPE)).toBe(false);
    });

    it('is false for legacy and unknown types', () => {
      expect(isUnifiedOnlyAttachmentType(AttachmentType.user)).toBe(false);
      expect(isUnifiedOnlyAttachmentType('something-custom')).toBe(false);
    });
  });
});

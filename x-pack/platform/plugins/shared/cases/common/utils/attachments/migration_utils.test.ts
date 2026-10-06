/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMENT_ATTACHMENT_TYPE,
  DASHBOARD_ATTACHMENT_TYPE,
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  LEGACY_ACTIONS_TYPE,
  LEGACY_FILE_ATTACHMENT_TYPE,
  INDICATOR_ATTACHMENT_TYPE,
  LEGACY_LENS_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  SECURITY_ENTITY_ATTACHMENT_TYPE,
  MAP_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  OSQUERY_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_TIMELINE_ATTACHMENT_TYPE,
  OWNER_TO_PREFIX_MAP,
  EXTERNAL_REFERENCE_TYPE_MAP,
  PERSISTABLE_ATTACHMENT_TYPES,
  PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP,
  UNIFIED_TO_LEGACY_MAP,
  registerOwnerPrefix,
} from '../../constants/attachments';
import { AttachmentType, ExternalReferenceStorageType } from '../../types/domain';
import { SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER, GENERAL_CASES_OWNER } from '../../constants';
import type { AttachmentRequestV2 } from '../../types/api';
import {
  getAttachmentTypeFromAttributes,
  getReferenceAttachmentId,
  isConvertibleToUnified,
  isPersistableType,
  resolveUnifiedAttachmentType,
  isUnifiedOnlyAttachmentType,
  toLegacyAttachmentType,
  toLegacyTypeMatches,
  toUnifiedAttachmentType,
} from './migration_utils';

const makeExternalReference = (externalReferenceAttachmentTypeId: string): AttachmentRequestV2 => ({
  type: AttachmentType.externalReference,
  externalReferenceAttachmentTypeId,
  externalReferenceId: 'ref-id',
  externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
  externalReferenceMetadata: null,
  owner,
});

const makePersistableState = (persistableStateAttachmentTypeId: string): AttachmentRequestV2 => ({
  type: AttachmentType.persistableState,
  persistableStateAttachmentTypeId,
  persistableStateAttachmentState: {},
  owner,
});

const makeUnifiedRef = (type: string): AttachmentRequestV2 => ({
  type,
  attachmentId: 'att-id',
  owner,
});

const makeAlert = (): AttachmentRequestV2 => ({
  type: AttachmentType.alert,
  alertId: 'alert-id',
  index: 'idx',
  rule: { id: 'rule-id', name: 'rule' },
  owner,
});

const makeEvent = (): AttachmentRequestV2 => ({
  type: AttachmentType.event,
  eventId: 'evt-id',
  index: 'idx',
  owner,
});

const owner = SECURITY_SOLUTION_OWNER;

describe('migration_utils', () => {
  describe('isConvertibleToUnified', () => {
    const withOwner = (attachment: AttachmentRequestV2, attachmentOwner: string) => ({
      ...attachment,
      owner: attachmentOwner,
    });

    it('is true for legacy user, event, and actions rows', () => {
      expect(isConvertibleToUnified({ type: AttachmentType.user, comment: 'hi', owner })).toBe(
        true
      );
      expect(isConvertibleToUnified(makeEvent())).toBe(true);
      expect(isConvertibleToUnified({ type: LEGACY_ACTIONS_TYPE, owner })).toBe(true);
    });

    it('is true for legacy alerts whose owner has a unified prefix', () => {
      expect(isConvertibleToUnified(makeAlert())).toBe(true);
      expect(isConvertibleToUnified(withOwner(makeAlert(), OBSERVABILITY_OWNER))).toBe(true);
      expect(isConvertibleToUnified(withOwner(makeAlert(), GENERAL_CASES_OWNER))).toBe(true);
    });

    it('is false for legacy alerts and events without a unified mapping', () => {
      expect(isConvertibleToUnified(withOwner(makeAlert(), 'unknownOwner'))).toBe(false);
      expect(isConvertibleToUnified(withOwner(makeEvent(), OBSERVABILITY_OWNER))).toBe(false);
    });

    it('is true for every mapped external reference subtype', () => {
      for (const subtype of Object.keys(EXTERNAL_REFERENCE_TYPE_MAP)) {
        expect(isConvertibleToUnified(makeExternalReference(subtype))).toBe(true);
      }
    });

    it('is true for every mapped persistable-state subtype, including ML and AIOps', () => {
      for (const subtype of Object.keys(PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP)) {
        expect(isConvertibleToUnified(makePersistableState(subtype))).toBe(true);
      }
    });

    it('is false for unmapped subtypes, even when the id collides with a unified type', () => {
      expect(isConvertibleToUnified(makeExternalReference('.test'))).toBe(false);
      expect(isConvertibleToUnified(makeExternalReference(COMMENT_ATTACHMENT_TYPE))).toBe(false);
      expect(isConvertibleToUnified(makePersistableState('.test'))).toBe(false);
      expect(isConvertibleToUnified(makePersistableState(LENS_ATTACHMENT_TYPE))).toBe(false);
    });

    it('is true for already-unified rows, including unknown types', () => {
      expect(isConvertibleToUnified(makeUnifiedRef(FILE_ATTACHMENT_TYPE))).toBe(true);
      expect(isConvertibleToUnified(makeUnifiedRef(DASHBOARD_ATTACHMENT_TYPE))).toBe(true);
      expect(isConvertibleToUnified(makeUnifiedRef('custom.type'))).toBe(true);
    });

    it('is false for attributes without a string type', () => {
      expect(isConvertibleToUnified(null)).toBe(false);
      expect(isConvertibleToUnified({ owner })).toBe(false);
    });
  });

  describe('toUnifiedAttachmentType', () => {
    it('does not produce undefined prefixes for unknown owners', () => {
      expect(toUnifiedAttachmentType(AttachmentType.event, 'unknownOwner')).toBe(
        AttachmentType.event
      );
    });
  });

  describe('registerOwnerPrefix', () => {
    const customOwner = 'customFixtureOwner';

    afterEach(() => {
      delete OWNER_TO_PREFIX_MAP[customOwner];
    });

    it('lets a dynamically registered owner resolve legacy alert/event to a unified type', () => {
      expect(toUnifiedAttachmentType(AttachmentType.alert, customOwner)).toBe(AttachmentType.alert);

      registerOwnerPrefix(customOwner, 'security');

      expect(toUnifiedAttachmentType(AttachmentType.alert, customOwner)).toBe(
        SECURITY_ALERT_ATTACHMENT_TYPE
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

  describe('toLegacyTypeMatches', () => {
    it('maps comment to the user type on comments SO', () => {
      expect(toLegacyTypeMatches(COMMENT_ATTACHMENT_TYPE)).toEqual([{ type: AttachmentType.user }]);
    });

    it('maps persistable types to persistableState plus subtype id', () => {
      expect(toLegacyTypeMatches(LENS_ATTACHMENT_TYPE)).toEqual([
        {
          type: AttachmentType.persistableState,
          field: 'persistableStateAttachmentTypeId',
          values: [LEGACY_LENS_ATTACHMENT_TYPE],
        },
      ]);
    });

    it('maps file to externalReference plus subtype id', () => {
      expect(toLegacyTypeMatches(FILE_ATTACHMENT_TYPE)).toEqual([
        {
          type: AttachmentType.externalReference,
          field: 'externalReferenceAttachmentTypeId',
          values: [LEGACY_FILE_ATTACHMENT_TYPE],
        },
      ]);
    });

    it('maps security.endpoint to the endpoint subtype and actions', () => {
      expect(toLegacyTypeMatches(SECURITY_ENDPOINT_ATTACHMENT_TYPE)).toEqual([
        {
          type: AttachmentType.externalReference,
          field: 'externalReferenceAttachmentTypeId',
          values: ['endpoint'],
        },
        { type: LEGACY_ACTIONS_TYPE },
      ]);
    });

    it('maps security.alert to alert rows of security owners', () => {
      const matches = toLegacyTypeMatches(SECURITY_ALERT_ATTACHMENT_TYPE);
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe(AttachmentType.alert);
      expect(matches[0].field).toBe('owner');
      expect(matches[0].values).toContain(SECURITY_SOLUTION_OWNER);
      expect(matches[0].values).not.toContain(OBSERVABILITY_OWNER);
    });

    it('returns empty for unified-only types', () => {
      expect(toLegacyTypeMatches(SECURITY_ENTITY_ATTACHMENT_TYPE)).toEqual([]);
      expect(toLegacyTypeMatches(DASHBOARD_ATTACHMENT_TYPE)).toEqual([]);
    });
  });

  describe('toLegacyAttachmentType - osquery', () => {
    it('maps the unified osquery type back to externalReference (top-level type)', () => {
      expect(toLegacyAttachmentType(OSQUERY_ATTACHMENT_TYPE)).toBe(
        AttachmentType.externalReference
      );
    });
  });

  describe('toLegacyAttachmentType - indicator', () => {
    it('maps the unified indicator type back to externalReference (top-level type)', () => {
      expect(toLegacyAttachmentType(INDICATOR_ATTACHMENT_TYPE)).toBe(
        AttachmentType.externalReference
      );
    });
  });

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

    it('returns the top-level type for plain attachments', () => {
      expect(getAttachmentTypeFromAttributes({ type: 'user' })).toBe('user');
      expect(getAttachmentTypeFromAttributes({ type: AttachmentType.alert })).toBe(
        AttachmentType.alert
      );
    });

    it('resolves mapped external reference subtypes to unified type names', () => {
      expect(
        getAttachmentTypeFromAttributes({
          type: AttachmentType.externalReference,
          externalReferenceAttachmentTypeId: 'endpoint',
        })
      ).toBe(SECURITY_ENDPOINT_ATTACHMENT_TYPE);
    });

    it('returns the raw subtype id for unrecognized external reference subtypes', () => {
      expect(
        getAttachmentTypeFromAttributes({
          type: AttachmentType.externalReference,
          externalReferenceAttachmentTypeId: 'some-unknown-type',
        })
      ).toBe('some-unknown-type');
    });

    it('returns the top-level type for external references without externalReferenceAttachmentTypeId', () => {
      expect(
        getAttachmentTypeFromAttributes({
          type: AttachmentType.externalReference,
        })
      ).toBe(AttachmentType.externalReference);
    });

    it('returns persistableStateAttachmentTypeId for persistable state attachments', () => {
      expect(
        getAttachmentTypeFromAttributes({
          type: AttachmentType.persistableState,
          persistableStateAttachmentTypeId: LEGACY_LENS_ATTACHMENT_TYPE,
        })
      ).toBe(LEGACY_LENS_ATTACHMENT_TYPE);
    });
  });

  describe('resolveUnifiedAttachmentType', () => {
    it('passes through unified types unchanged', () => {
      expect(resolveUnifiedAttachmentType(makeUnifiedRef(LENS_ATTACHMENT_TYPE), owner)).toBe(
        LENS_ATTACHMENT_TYPE
      );
      expect(resolveUnifiedAttachmentType(makeUnifiedRef(FILE_ATTACHMENT_TYPE), owner)).toBe(
        FILE_ATTACHMENT_TYPE
      );
    });

    it('maps legacy alert/event using owner prefix', () => {
      expect(resolveUnifiedAttachmentType(makeAlert(), owner)).toBe('security.alert');
      expect(resolveUnifiedAttachmentType(makeEvent(), owner)).toBe('security.event');
    });

    it('resolves legacy externalReference + typeId to the unified type', () => {
      expect(resolveUnifiedAttachmentType(makeExternalReference('.files'), owner)).toBe(
        FILE_ATTACHMENT_TYPE
      );
      expect(resolveUnifiedAttachmentType(makeExternalReference('endpoint'), owner)).toBe(
        SECURITY_ENDPOINT_ATTACHMENT_TYPE
      );
      expect(
        resolveUnifiedAttachmentType(makeExternalReference(OSQUERY_ATTACHMENT_TYPE), owner)
      ).toBe(OSQUERY_ATTACHMENT_TYPE);
      expect(resolveUnifiedAttachmentType(makeExternalReference('indicator'), owner)).toBe(
        INDICATOR_ATTACHMENT_TYPE
      );
    });

    it('falls back to the raw subtype id for unrecognized externalReference subtypes', () => {
      expect(resolveUnifiedAttachmentType(makeExternalReference('unknownSubtype'), owner)).toBe(
        'unknownSubtype'
      );
    });

    it('resolves legacy persistableState + typeId to the unified persistable type', () => {
      expect(
        resolveUnifiedAttachmentType(makePersistableState(LEGACY_LENS_ATTACHMENT_TYPE), owner)
      ).toBe(LENS_ATTACHMENT_TYPE);
    });
  });

  describe('isUnifiedOnlyAttachmentType', () => {
    it('is true for unified types with no legacy equivalent', () => {
      expect(isUnifiedOnlyAttachmentType(SECURITY_TIMELINE_ATTACHMENT_TYPE)).toBe(true);
      expect(isUnifiedOnlyAttachmentType(SECURITY_ENTITY_ATTACHMENT_TYPE)).toBe(true);
      expect(isUnifiedOnlyAttachmentType(DASHBOARD_ATTACHMENT_TYPE)).toBe(true);
      expect(isUnifiedOnlyAttachmentType(MAP_ATTACHMENT_TYPE)).toBe(true);
      expect(isUnifiedOnlyAttachmentType(DISCOVER_SESSION_ATTACHMENT_TYPE)).toBe(true);
    });

    it('is false for unified types that map back to a legacy type', () => {
      expect(isUnifiedOnlyAttachmentType(SECURITY_ALERT_ATTACHMENT_TYPE)).toBe(false);
      expect(isUnifiedOnlyAttachmentType(FILE_ATTACHMENT_TYPE)).toBe(false);
    });

    it('is false for persistable unified types', () => {
      expect(isUnifiedOnlyAttachmentType(LENS_ATTACHMENT_TYPE)).toBe(false);
    });

    it('is false for every legacy type name', () => {
      for (const legacyType of Object.values(AttachmentType)) {
        expect(isUnifiedOnlyAttachmentType(legacyType)).toBe(false);
      }
    });

    it('is true for an unknown unified type, since it has no legacy mapping', () => {
      expect(isUnifiedOnlyAttachmentType('something-custom')).toBe(true);
    });

    it('is false for every unified type in the legacy maps', () => {
      for (const unifiedType of Object.keys(UNIFIED_TO_LEGACY_MAP)) {
        expect(isUnifiedOnlyAttachmentType(unifiedType)).toBe(false);
      }
      for (const persistableType of PERSISTABLE_ATTACHMENT_TYPES) {
        expect(isUnifiedOnlyAttachmentType(persistableType)).toBe(false);
      }
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

  describe('getReferenceAttachmentId', () => {
    it('returns attachmentId for unified reference attachments', () => {
      expect(getReferenceAttachmentId(makeUnifiedRef(SECURITY_ALERT_ATTACHMENT_TYPE))).toBe(
        'att-id'
      );
    });

    it('returns alertId for legacy alert attachments', () => {
      expect(getReferenceAttachmentId(makeAlert())).toBe('alert-id');
    });

    it('returns eventId for legacy event attachments', () => {
      expect(getReferenceAttachmentId(makeEvent())).toBe('evt-id');
    });

    it('preserves array reference ids', () => {
      expect(
        getReferenceAttachmentId({
          type: AttachmentType.alert,
          alertId: ['a', 'b'],
          index: ['i', 'j'],
          rule: { id: 'rule-id', name: 'rule' },
          owner,
        })
      ).toEqual(['a', 'b']);
    });

    it('returns undefined for non-reference attachments (user comment)', () => {
      expect(
        getReferenceAttachmentId({ type: AttachmentType.user, comment: 'hi', owner })
      ).toBeUndefined();
    });
  });
});

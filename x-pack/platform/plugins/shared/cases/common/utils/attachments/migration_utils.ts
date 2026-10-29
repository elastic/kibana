/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import {
  EXTERNAL_REFERENCE_TYPE_MAP,
  LEGACY_ATTACHMENT_TYPES,
  LEGACY_TO_UNIFIED_MAP,
  PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP,
  PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP,
  PERSISTABLE_ATTACHMENT_TYPES,
  UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP,
  UNIFIED_TO_LEGACY_MAP,
  OWNER_TO_PREFIX_MAP,
  PREFIX_TO_OWNER_MAP,
  LEGACY_EVENT_TYPE,
  LEGACY_ALERT_TYPE,
  LEGACY_EXTERNAL_REFERENCE_TYPE,
  LEGACY_PERSISTABLE_STATE_TYPE,
} from '../../constants/attachments';
import { AttachmentType } from '../../types/domain';
import type { AttachmentRequestV2 } from '../../types/api';

/**
 * True when stored attributes can be read in the unified shape: unified rows already are, and
 * legacy rows convert when the legacy maps give them a unified type. Subtypes are matched on
 * the raw id, so an unmapped one that collides with a unified name stays legacy.
 */
export const isConvertibleToUnified = (attributes: unknown): boolean => {
  if (!isPlainObject(attributes)) {
    return false;
  }
  const { type, owner, externalReferenceAttachmentTypeId, persistableStateAttachmentTypeId } =
    attributes as Record<string, unknown>;
  if (typeof type !== 'string') {
    return false;
  }
  if (!LEGACY_ATTACHMENT_TYPES.has(type)) {
    return true;
  }

  switch (type) {
    case LEGACY_EXTERNAL_REFERENCE_TYPE:
      return (
        typeof externalReferenceAttachmentTypeId === 'string' &&
        Object.hasOwn(EXTERNAL_REFERENCE_TYPE_MAP, externalReferenceAttachmentTypeId)
      );
    case LEGACY_PERSISTABLE_STATE_TYPE:
      return (
        typeof persistableStateAttachmentTypeId === 'string' &&
        Object.hasOwn(PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP, persistableStateAttachmentTypeId)
      );
    default:
      return Object.hasOwn(
        UNIFIED_TO_LEGACY_MAP,
        toUnifiedAttachmentType(type, typeof owner === 'string' ? owner : '')
      );
  }
};

/**
 * True when a unified type has no legacy (v1) form: it is not a legacy name and is absent
 * from `UNIFIED_TO_LEGACY_MAP` and the persistable-state map. Whether the type is allowed
 * at all is the registry's call, not this check's.
 */
export const isUnifiedOnlyAttachmentType = (type: string): boolean => {
  if (LEGACY_ATTACHMENT_TYPES.has(type)) {
    return false;
  }
  const hasLegacyMapping = type in UNIFIED_TO_LEGACY_MAP;
  const isPersistable = PERSISTABLE_ATTACHMENT_TYPES.has(type);
  return !hasLegacyMapping && !isPersistable;
};

export const toLegacyAttachmentType = (type?: string): string | undefined => {
  if (typeof type !== 'string') {
    return undefined;
  }
  if (type in PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP) {
    return toLegacyPersistableStateAttachmentType(type);
  }
  return UNIFIED_TO_LEGACY_MAP[type] ?? type;
};

/**
 * How a unified type is stored on `cases-comments`. Empty means no comments-SO row.
 * `field`/`values` AND with `type` when several unified types share one comments `type`.
 */
export interface LegacyTypeMatch {
  type: string;
  field?: string;
  values?: string[];
}

const ownersForUnifiedPrefix = (type: string): string[] => {
  const lastDot = type.lastIndexOf('.');
  if (lastDot <= 0) {
    return [];
  }
  const prefix = type.slice(0, lastDot);
  return Object.entries(OWNER_TO_PREFIX_MAP)
    .filter(([, mappedPrefix]) => mappedPrefix === prefix)
    .map(([owner]) => owner);
};

const foldedLegacyTypes = (unifiedType: string): LegacyTypeMatch[] =>
  Object.entries(LEGACY_TO_UNIFIED_MAP)
    .filter(([, mapped]) => mapped === unifiedType)
    .map(([type]) => ({ type }));

export const toLegacyTypeMatches = (unifiedType: string): LegacyTypeMatch[] => {
  if (Object.hasOwn(PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP, unifiedType)) {
    return [
      {
        type: LEGACY_PERSISTABLE_STATE_TYPE,
        field: 'persistableStateAttachmentTypeId',
        values: [toLegacyPersistableStateAttachmentType(unifiedType)],
      },
    ];
  }

  const externalReferenceId = UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP[unifiedType];
  if (externalReferenceId !== undefined) {
    return [
      {
        type: LEGACY_EXTERNAL_REFERENCE_TYPE,
        field: 'externalReferenceAttachmentTypeId',
        values: [externalReferenceId],
      },
      ...foldedLegacyTypes(unifiedType),
    ];
  }

  const legacyType = UNIFIED_TO_LEGACY_MAP[unifiedType];
  if (legacyType === LEGACY_ALERT_TYPE || legacyType === LEGACY_EVENT_TYPE) {
    const owners = ownersForUnifiedPrefix(unifiedType);
    if (owners.length === 0) {
      return [];
    }
    return [{ type: legacyType, field: 'owner', values: owners }];
  }

  if (legacyType) {
    return [{ type: legacyType }];
  }

  return [];
};

export const toUnifiedAttachmentType = (type: string, owner: string): string => {
  if (type === LEGACY_EVENT_TYPE || type === LEGACY_ALERT_TYPE) {
    const ownerPrefix = OWNER_TO_PREFIX_MAP[owner];
    if (ownerPrefix == null) {
      return type;
    }
    return `${ownerPrefix}.${type}`;
  }
  return LEGACY_TO_UNIFIED_MAP[type] ?? type;
};

/**
 * Returns true when the owner has a registered prefix in `OWNER_TO_PREFIX_MAP`,
 * meaning legacy `alert` / `event` types can be mapped to a valid unified
 * `<prefix>.<type>` (e.g. `security.alert`).
 */
export const hasOwnerUnifiedPrefix = (owner: string): boolean => OWNER_TO_PREFIX_MAP[owner] != null;

/**
 * A type with a solution prefix (security, observability, stack) must match the owner.
 * Types with no prefix (comment, lens) or another prefix (ml, aiops) are allowed for any owner.
 */
export const isTypeAllowedForOwner = (type: string, owner: string): boolean => {
  const [prefix, ...rest] = type.split('.');
  if (rest.length === 0 || !Object.hasOwn(PREFIX_TO_OWNER_MAP, prefix)) {
    return true;
  }
  return OWNER_TO_PREFIX_MAP[owner] === prefix;
};

/**
 * True when the persistable-state subtype id (legacy `.lens` or unified `lens`) has a
 * unified mapping in `PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP` (Lens, ML, AIOps).
 */
export const isPersistableType = (type: string): boolean =>
  PERSISTABLE_ATTACHMENT_TYPES.has(toUnifiedPersistableStateAttachmentType(type));

export const toUnifiedPersistableStateAttachmentType = (type: string): string => {
  return PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP[type] ?? type;
};

export const toLegacyPersistableStateAttachmentType = (type: string): string => {
  return PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP[type] ?? type;
};

/**
 * Returns a routing key derived from raw attachment attributes — useful when working
 * with persisted SO data of unknown shape.
 *
 * Not a fully-normalized unified type — for that compose with
 * {@link toUnifiedAttachmentType} / {@link toUnifiedPersistableStateAttachmentType}
 * (or use {@link resolveUnifiedAttachmentType}).
 *
 * @throws Error if attributes is null or not an object, or if `type` is missing.
 */
export const getAttachmentTypeFromAttributes = (attributes: unknown): string => {
  if (!isPlainObject(attributes)) {
    throw new Error('Invalid attributes: expected non-null object');
  }
  const { type, persistableStateAttachmentTypeId, externalReferenceAttachmentTypeId } =
    attributes as Record<string, unknown>;
  if (typeof type !== 'string') {
    throw new Error('Invalid attributes: missing attachment type');
  }
  if (
    type === AttachmentType.persistableState &&
    typeof persistableStateAttachmentTypeId === 'string'
  ) {
    return persistableStateAttachmentTypeId;
  }
  if (
    type === AttachmentType.externalReference &&
    typeof externalReferenceAttachmentTypeId === 'string'
  ) {
    // Fall back to the raw subtype id (not the generic `type`) on a map miss, so callers
    // building log/error messages can still identify which subtype was unrecognized.
    return (
      EXTERNAL_REFERENCE_TYPE_MAP[externalReferenceAttachmentTypeId] ??
      externalReferenceAttachmentTypeId
    );
  }
  return type;
};

/**
 * Resolves a typed V2 attachment to its fully-normalized unified type
 * (`security.alert`, `lens`, `file`, …).
 */
export const resolveUnifiedAttachmentType = (
  attachment: AttachmentRequestV2,
  owner: string
): string => {
  const routingKey = getAttachmentTypeFromAttributes(attachment);
  return toUnifiedAttachmentType(toUnifiedPersistableStateAttachmentType(routingKey), owner);
};

/**
 * Extracts the reference id from a reference-based attachment for delete label
 * Other reference attachment ids are not extracted because they are singular
 * and delete label is static.
 */
export const getReferenceAttachmentId = (
  attachment: AttachmentRequestV2
): string | string[] | undefined => {
  if ('attachmentId' in attachment) {
    return attachment.attachmentId;
  }
  if ('alertId' in attachment) {
    return attachment.alertId;
  }
  if ('eventId' in attachment) {
    return attachment.eventId;
  }
  return undefined;
};

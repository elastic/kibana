/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_SO_TYPE,
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  DISCOVER_SESSION_SO_TYPE,
  MAP_ATTACHMENT_TYPE,
  MAP_SO_TYPE,
} from '../../../../../common/constants/attachments';
import type { AttachmentUIV2 } from '../../../../../common/ui/types';
import type { FoundSavedObject, SavedObjectAttachmentAttributes } from './types';

/**
 * Maps each attachment-type id that represents a saved-object attachment to
 * its SO type name as understood by the `_find` API and in-app URLs. Single
 * source of truth for "is this attachment a saved-object reference, and which
 * SO type does it point at?".
 */
export const ATTACHMENT_TYPE_TO_SO_TYPE = {
  [DASHBOARD_ATTACHMENT_TYPE]: DASHBOARD_SO_TYPE,
  [DISCOVER_SESSION_ATTACHMENT_TYPE]: DISCOVER_SESSION_SO_TYPE,
  [MAP_ATTACHMENT_TYPE]: MAP_SO_TYPE,
} as const satisfies Record<string, string>;

export type SavedObjectAttachmentType = keyof typeof ATTACHMENT_TYPE_TO_SO_TYPE;
export type SupportedSavedObjectType =
  (typeof ATTACHMENT_TYPE_TO_SO_TYPE)[SavedObjectAttachmentType];

/** Attachment-type ids that correspond to saved-object attachments. */
export const SAVED_OBJECT_ATTACHMENT_TYPES = new Set<string>(
  Object.keys(ATTACHMENT_TYPE_TO_SO_TYPE)
);

/** SO types the attach modal can search for, derived from the same source. */
export const SUPPORTED_SO_TYPES = Object.values(
  ATTACHMENT_TYPE_TO_SO_TYPE
) as SupportedSavedObjectType[];

/** Inverse of `ATTACHMENT_TYPE_TO_SO_TYPE`, used by the attach action. */
export const SO_TYPE_TO_ATTACHMENT_TYPE = Object.fromEntries(
  Object.entries(ATTACHMENT_TYPE_TO_SO_TYPE).map(([attachmentType, soType]) => [
    soType,
    attachmentType,
  ])
) as Record<SupportedSavedObjectType, SavedObjectAttachmentType>;

/**
 * Type guard: narrows an `AttachmentUIV2` to a saved-object unified attachment.
 * Reads the SO-backed shape (`attachmentId`, `metadata.title`, `metadata.soType`)
 * after the type check, replacing the previous `as unknown as` cast.
 */
const isSavedObjectAttachment = (
  attachment: AttachmentUIV2
): attachment is AttachmentUIV2 & {
  attachmentId: string;
  metadata: { title: string; soType: SupportedSavedObjectType };
} => SAVED_OBJECT_ATTACHMENT_TYPES.has(attachment.type);

/**
 * Extracts the SO-attachment attributes (foreign SO id, soType, cached title)
 * from any SO-backed unified attachment.
 */
export const getSavedObjectAttachmentAttributes = (
  attachment: AttachmentUIV2
): SavedObjectAttachmentAttributes | null => {
  if (!isSavedObjectAttachment(attachment)) {
    return null;
  }
  const { attachmentId, metadata } = attachment;
  return { attachmentId, soType: metadata.soType, title: metadata.title };
};

/**
 * Walks `caseData.comments` once to collect the foreign SO ids of every
 * SO-typed attachment on the case.
 */
export const getAttachedSavedObjectIds = (attachments: AttachmentUIV2[]): Set<string> =>
  attachments.reduce<Set<string>>((ids, attachment) => {
    const attributes = getSavedObjectAttachmentAttributes(attachment);
    if (attributes) {
      ids.add(attributes.attachmentId);
    }
    return ids;
  }, new Set());

/**
 * Walks the dotted `uiCapabilitiesPath` on `application.capabilities` to decide
 * whether the current user can open the SO in its source app. Returns true
 * when the SO has no `inAppUrl` capability requirement at all.
 */
export const canAccessSavedObject = (
  object: FoundSavedObject,
  capabilities: ApplicationStart['capabilities']
): boolean => {
  const { inAppUrl } = object.meta;
  if (!inAppUrl) {
    return false;
  }
  if (!inAppUrl.uiCapabilitiesPath) {
    return true;
  }
  const segments = inAppUrl.uiCapabilitiesPath.split('.');
  let current: unknown = capabilities;
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return Boolean(current);
};

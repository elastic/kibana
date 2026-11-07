/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import type { HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import type {
  UnknownAttachment,
  UpdateOriginResponse,
} from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';

export const UNSAVED_CHANGES_BADGE: HeaderBadge = {
  label: i18n.translate('xpack.alertingV2.attachments.unsavedChangesBadge', {
    defaultMessage: 'Unsaved changes',
  }),
  color: 'warning',
};

// Agent builder does not pass the new origin_snapshot_at back into rendered attachments after
// updateOrigin, so the latest sync date per attachment is kept here for the rest of the page session.
const recordedSyncedAt = new Map<string, string>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Records the sync date from an `updateOrigin` response. */
export const recordAttachmentSync = (
  attachmentId: string,
  response: UpdateOriginResponse | undefined
): void => {
  const syncedAt = response?.attachment.origin_snapshot_at;
  if (!syncedAt) {
    return;
  }
  recordedSyncedAt.set(attachmentId, syncedAt);
  listeners.forEach((listener) => listener());
};

/** The sync date recorded for an attachment in this page session, if any. */
export const useRecordedAttachmentSync = (attachmentId: string): string | undefined =>
  useSyncExternalStore(subscribe, () => recordedSyncedAt.get(attachmentId));

const getLaterTimestamp = (
  first: string | undefined,
  second: string | undefined
): string | undefined => {
  if (!first || !second) {
    return first ?? second;
  }
  return Date.parse(second) > Date.parse(first) ? second : first;
};

/** True when the latest version was edited in the chat after it was last saved to its origin. */
export const hasUnsavedChanges = ({
  id,
  origin,
  versionData,
}: Pick<UnknownAttachment, 'id' | 'origin' | 'versionData'>): boolean => {
  const originSyncedAt = getLaterTimestamp(versionData?.originSyncedAt, recordedSyncedAt.get(id));
  if (!origin || !versionData || !originSyncedAt) {
    return false;
  }
  // Older versions in the timeline are superseded, so only the latest one can need saving.
  if (versionData.version !== versionData.versionCount) {
    return false;
  }
  // Equal timestamps mean the version was snapshotted from the origin, so it is in sync.
  return Date.parse(versionData.createdAt) > Date.parse(originSyncedAt);
};

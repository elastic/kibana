/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type {
  UnknownAttachment,
  UpdateOriginResponse,
} from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

/**
 * How the attachment's own version compares to the last save. Remote drift is separate.
 * `unknown` means the attachment is linked but has no sync timestamp to compare against.
 */
export type AttachmentLocalPersistence = 'unsaved' | 'unsaved_changes' | 'in_sync' | 'unknown';

export interface AttachmentPersistenceState {
  /** True when the attachment is linked to a saved object via `origin`. */
  isPersisted: boolean;
  isSaving: boolean;
  outOfSync: boolean;
  local: AttachmentLocalPersistence;
  /** Older versions in the conversation timeline are not compared against the saved object. */
  isLatestVersion: boolean;
}

export type AttachmentPersistenceNoticeKind =
  | 'saving'
  | 'out_of_sync'
  | 'unsaved_changes'
  | 'saved';

export interface AttachmentRunStatus {
  label: string;
  color: 'default' | 'success' | 'warning';
}

export interface AttachmentRunStatusLabels {
  draft: string;
  enabled: string;
  disabled: string;
}

export const SAVING_LABEL = i18n.translate('xpack.alertingV2.attachmentPersistence.saving', {
  defaultMessage: 'Saving...',
});

export const ALL_CHANGES_SAVED_LABEL = i18n.translate(
  'xpack.alertingV2.attachmentPersistence.allChangesSaved',
  { defaultMessage: 'All changes saved' }
);

const OUT_OF_SYNC_TITLE = i18n.translate('xpack.alertingV2.attachmentPersistence.outOfSyncTitle', {
  defaultMessage: 'Not in sync',
});

const UNSAVED_CHANGES_TITLE = i18n.translate(
  'xpack.alertingV2.attachmentPersistence.unsavedChangesTitle',
  { defaultMessage: 'Unsaved changes' }
);

const savingIds = new Set<string>();
// The agent builder does not push a new `origin_snapshot_at` into rendered previews after
// `updateOrigin`, so successful saves are recorded here until the props catch up.
const syncedAtById = new Map<string, string>();
const listeners = new Set<() => void>();

const emitChange = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Runs a create or update while both the preview and the canvas show a saving state. */
export const runAttachmentSave = async (
  attachmentId: string,
  task: () => Promise<void>
): Promise<void> => {
  if (savingIds.has(attachmentId)) {
    return;
  }
  savingIds.add(attachmentId);
  emitChange();
  try {
    await task();
  } finally {
    savingIds.delete(attachmentId);
    emitChange();
  }
};

/** Links the attachment to its saved object and marks the current version as synced. */
export const syncAttachmentOrigin = async (
  attachmentId: string,
  origin: string,
  updateOrigin: (origin: string) => Promise<UpdateOriginResponse | undefined>
): Promise<UpdateOriginResponse | undefined> => {
  const result = await updateOrigin(origin);
  const syncedAt = result?.attachment.origin_snapshot_at;
  if (syncedAt) {
    syncedAtById.set(attachmentId, syncedAt);
    emitChange();
  }
  return result;
};

const useAttachmentIsSaving = (attachmentId: string): boolean =>
  useSyncExternalStore(
    subscribe,
    () => savingIds.has(attachmentId),
    () => savingIds.has(attachmentId)
  );

const useRecordedSyncedAt = (attachmentId: string): string | undefined =>
  useSyncExternalStore(
    subscribe,
    () => syncedAtById.get(attachmentId),
    () => syncedAtById.get(attachmentId)
  );

const isAfter = (later: string, earlier: string): boolean => {
  const laterTime = Date.parse(later);
  const earlierTime = Date.parse(earlier);
  if (Number.isNaN(laterTime) || Number.isNaN(earlierTime)) {
    return false;
  }
  return laterTime > earlierTime;
};

const getLatestTimestamp = (
  first: string | undefined,
  second: string | undefined
): string | undefined => {
  if (!first || !second) {
    return first ?? second;
  }
  return isAfter(second, first) ? second : first;
};

interface LocalPersistenceParams {
  origin: string | undefined;
  createdAt: string | undefined;
  originSyncedAt: string | undefined;
}

/**
 * No origin means the attachment has never been saved.
 * A version created after `originSyncedAt` is a local edit of a saved object.
 * Anything else still matches the last sync. A newer saved object is `useAttachmentOutOfSync`.
 */
export const getAttachmentLocalPersistence = ({
  origin,
  createdAt,
  originSyncedAt,
}: LocalPersistenceParams): AttachmentLocalPersistence => {
  if (!origin) {
    return 'unsaved';
  }
  if (!originSyncedAt) {
    return 'unknown';
  }
  if (createdAt && isAfter(createdAt, originSyncedAt)) {
    return 'unsaved_changes';
  }
  return 'in_sync';
};

interface UseAttachmentOutOfSyncParams {
  origin: string | undefined;
  /** `updated_at` captured in the attachment data when it was snapshotted. */
  snapshotUpdatedAt: string | undefined;
  originSyncedAt: string | undefined;
  /** Resolves the saved object's current `updated_at`. Must be referentially stable. */
  fetchUpdatedAt: (id: string, signal: AbortSignal) => Promise<string>;
  /** Skips the request, for example for older versions in the timeline. */
  enabled?: boolean;
}

/** Mirrors the server `isStale` check so the preview and the agent agree on drift. */
export const useAttachmentOutOfSync = ({
  origin,
  snapshotUpdatedAt,
  originSyncedAt,
  fetchUpdatedAt,
  enabled = true,
}: UseAttachmentOutOfSyncParams): boolean => {
  const [outOfSync, setOutOfSync] = useState(false);

  useEffect(() => {
    // No sync timestamp means the attachment has not recorded a comparison point.
    if (!enabled || !origin || !snapshotUpdatedAt || !originSyncedAt) {
      setOutOfSync(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    fetchUpdatedAt(origin, controller.signal)
      .then((updatedAt) => {
        if (!active) {
          return;
        }
        setOutOfSync(isAfter(updatedAt, originSyncedAt) && updatedAt !== snapshotUpdatedAt);
      })
      .catch(() => {
        if (active) {
          setOutOfSync(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, fetchUpdatedAt, origin, snapshotUpdatedAt, originSyncedAt]);

  return outOfSync;
};

interface UseAttachmentPersistenceOptions {
  snapshotUpdatedAt: string | undefined;
  fetchUpdatedAt: UseAttachmentOutOfSyncParams['fetchUpdatedAt'];
}

export const useAttachmentPersistence = (
  attachment: Pick<UnknownAttachment, 'id' | 'origin' | 'versionData'>,
  { snapshotUpdatedAt, fetchUpdatedAt }: UseAttachmentPersistenceOptions
): AttachmentPersistenceState => {
  const { id, origin, versionData } = attachment;
  const isSaving = useAttachmentIsSaving(id);
  const recordedSyncedAt = useRecordedSyncedAt(id);
  const originSyncedAt = getLatestTimestamp(versionData?.originSyncedAt, recordedSyncedAt);
  const isLatestVersion = !versionData || versionData.version === versionData.versionCount;
  const outOfSync = useAttachmentOutOfSync({
    origin,
    snapshotUpdatedAt,
    originSyncedAt,
    fetchUpdatedAt,
    enabled: isLatestVersion,
  });
  const local = getAttachmentLocalPersistence({
    origin,
    createdAt: versionData?.createdAt,
    originSyncedAt,
  });
  return { isPersisted: Boolean(origin), isSaving, outOfSync, local, isLatestVersion };
};

/** The single notice to show for a persistence state, in priority order. */
export const getAttachmentPersistenceNotice = ({
  isSaving,
  outOfSync,
  local,
  isLatestVersion,
}: AttachmentPersistenceState): AttachmentPersistenceNoticeKind | undefined => {
  if (!isLatestVersion) {
    return undefined;
  }
  if (isSaving) {
    return 'saving';
  }
  if (outOfSync) {
    return 'out_of_sync';
  }
  if (local === 'unsaved_changes') {
    return 'unsaved_changes';
  }
  if (local === 'in_sync') {
    return 'saved';
  }
  return undefined;
};

export const showsAttachmentPersistenceNotice = (state: AttachmentPersistenceState): boolean =>
  getAttachmentPersistenceNotice(state) !== undefined;

/** True when the saved object already matches this version, so there is nothing to update. */
export const isAttachmentSaved = (state: AttachmentPersistenceState): boolean =>
  getAttachmentPersistenceNotice(state) === 'saved';

/** Draft, enabled, or disabled. Separate from unsaved edits and remote drift. */
export const getAttachmentRunStatus = (
  labels: AttachmentRunStatusLabels,
  isDraft: boolean,
  isEnabled: boolean
): AttachmentRunStatus => {
  if (isDraft) {
    return { label: labels.draft, color: 'default' };
  }
  if (isEnabled) {
    return { label: labels.enabled, color: 'success' };
  }
  return { label: labels.disabled, color: 'warning' };
};

export interface AttachmentPersistenceNoticeProps extends AttachmentPersistenceState {
  outOfSyncMessage: string;
  unsavedChangesMessage: string;
}

export const AttachmentPersistenceNotice = ({
  outOfSyncMessage,
  unsavedChangesMessage,
  ...state
}: AttachmentPersistenceNoticeProps) => {
  const notice = getAttachmentPersistenceNotice(state);

  if (notice === 'saving') {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj="attachmentPersistenceSaving"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{SAVING_LABEL}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (notice === 'out_of_sync') {
    return (
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={OUT_OF_SYNC_TITLE}
        text={outOfSyncMessage}
        data-test-subj="attachmentPersistenceOutOfSync"
      />
    );
  }

  if (notice === 'unsaved_changes') {
    return (
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={UNSAVED_CHANGES_TITLE}
        text={unsavedChangesMessage}
        data-test-subj="attachmentPersistenceUnsavedChanges"
      />
    );
  }

  if (notice === 'saved') {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj="attachmentPersistenceSaved"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkCircleFill" color="success" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {ALL_CHANGES_SAVED_LABEL}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
};

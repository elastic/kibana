/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';

export const UNSAVED_CHANGES_BADGE: HeaderBadge = {
  label: i18n.translate('xpack.alertingV2.attachments.unsavedChangesBadge', {
    defaultMessage: 'Unsaved changes',
  }),
  color: 'warning',
};

/** True when the latest version was edited in the chat after it was last saved to its origin. */
export const hasUnsavedChanges = ({
  origin,
  versionData,
}: Pick<UnknownAttachment, 'origin' | 'versionData'>): boolean => {
  if (!origin || !versionData?.originSyncedAt) {
    return false;
  }
  // Older versions in the timeline are superseded, so only the latest one can need saving.
  if (versionData.version !== versionData.versionCount) {
    return false;
  }
  // Equal timestamps mean the version was snapshotted from the origin, so it is in sync.
  return Date.parse(versionData.createdAt) > Date.parse(versionData.originSyncedAt);
};

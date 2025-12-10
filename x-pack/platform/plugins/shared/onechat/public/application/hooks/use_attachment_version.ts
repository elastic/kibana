/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useCallback } from 'react';
import type { VersionedAttachment, AttachmentVersion } from '@kbn/onechat-common/attachments';
import { getVersion } from '@kbn/onechat-common/attachments';

export interface UseAttachmentVersionOptions {
  /** The attachment to manage versions for */
  attachment: VersionedAttachment;
  /** Initial version to select (defaults to current_version) */
  initialVersion?: number;
}

export interface UseAttachmentVersionReturn {
  /** The current version number of the attachment (latest) */
  currentVersion: number;
  /** The currently selected version number */
  selectedVersion: number;
  /** Set the selected version */
  setSelectedVersion: (version: number) => void;
  /** Go to the previous version */
  goToPrevious: () => void;
  /** Go to the next version */
  goToNext: () => void;
  /** Whether we can go to a previous version */
  canGoBack: boolean;
  /** Whether we can go to a next version */
  canGoForward: boolean;
  /** The data for the currently selected version */
  versionData: AttachmentVersion | undefined;
  /** Total number of versions */
  totalVersions: number;
  /** Whether the selected version is the latest */
  isLatestVersion: boolean;
  /** Whether the selected version is deleted */
  isDeletedVersion: boolean;
}

/**
 * Hook for managing attachment version navigation state.
 *
 * @example
 * ```tsx
 * const {
 *   selectedVersion,
 *   goToPrevious,
 *   goToNext,
 *   canGoBack,
 *   canGoForward,
 *   versionData
 * } = useAttachmentVersion({ attachment, initialVersion: 1 });
 * ```
 */
export function useAttachmentVersion({
  attachment,
  initialVersion,
}: UseAttachmentVersionOptions): UseAttachmentVersionReturn {
  // The latest version (attachment.current_version)
  const currentVersion = attachment.current_version;

  // Initialize selected version
  const [selectedVersion, setSelectedVersion] = useState(
    initialVersion ?? currentVersion
  );

  // Get the data for the selected version
  const versionData = useMemo(() => {
    return getVersion(attachment, selectedVersion);
  }, [attachment, selectedVersion]);

  // Navigation state
  const minVersion = 1;
  const maxVersion = attachment.versions.length;

  const canGoBack = selectedVersion > minVersion;
  const canGoForward = selectedVersion < maxVersion;

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    if (canGoBack) {
      setSelectedVersion((v) => v - 1);
    }
  }, [canGoBack]);

  const goToNext = useCallback(() => {
    if (canGoForward) {
      setSelectedVersion((v) => v + 1);
    }
  }, [canGoForward]);

  // Derived state
  const isLatestVersion = selectedVersion === currentVersion;
  const isDeletedVersion = versionData?.status === 'deleted';

  return {
    currentVersion,
    selectedVersion,
    setSelectedVersion,
    goToPrevious,
    goToNext,
    canGoBack,
    canGoForward,
    versionData,
    totalVersions: attachment.versions.length,
    isLatestVersion,
    isDeletedVersion,
  };
}

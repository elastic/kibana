/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { OpenSpineOptions } from '../types';

interface UseOpenSpineOnFirstAttachmentParams {
  attachmentCount: number;
  isAgentWorkspaceMount: boolean;
  isSpineActive: boolean;
  openSpine: (options?: OpenSpineOptions) => void;
  closeAttachmentsEmptyOverlay: () => void;
}

export const useOpenSpineOnFirstAttachment = ({
  attachmentCount,
  isAgentWorkspaceMount,
  isSpineActive,
  openSpine,
  closeAttachmentsEmptyOverlay,
}: UseOpenSpineOnFirstAttachmentParams): void => {
  const prevAttachmentCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAgentWorkspaceMount) {
      prevAttachmentCountRef.current = attachmentCount;
      return;
    }

    const prevCount = prevAttachmentCountRef.current;
    prevAttachmentCountRef.current = attachmentCount;

    if (prevCount === null) {
      return;
    }

    if (prevCount === 0 && attachmentCount > 0) {
      closeAttachmentsEmptyOverlay();
      if (!isSpineActive) {
        openSpine({
          tabId: 'attachments',
          attachmentsView: { mode: 'grid' },
        });
      }
    }
  }, [
    attachmentCount,
    closeAttachmentsEmptyOverlay,
    isAgentWorkspaceMount,
    isSpineActive,
    openSpine,
  ]);
};

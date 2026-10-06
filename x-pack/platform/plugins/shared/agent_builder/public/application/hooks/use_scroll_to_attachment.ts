/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ScrollToAttachmentTarget } from './use_conversation_scroll_actions';

export const SCROLL_TO_ATTACHMENT_DELAY_MS = 500;

interface UseScrollToAttachmentOptions {
  isFetched: boolean;
  conversationId?: string;
  target?: ScrollToAttachmentTarget;
  scrollToAttachment: (target: ScrollToAttachmentTarget) => boolean;
  clearTarget?: () => void;
}

/**
 * Once the conversation has loaded and stuck to the bottom, scrolls to the requested inline
 * attachment after a delay that lets the timeline's items render, then clears the request so a
 * reload does not scroll again and a repeat request scrolls anew.
 */
export const useScrollToAttachment = ({
  isFetched,
  conversationId,
  target,
  scrollToAttachment,
  clearTarget,
}: UseScrollToAttachmentOptions): void => {
  const targetId = target?.id;
  const targetVersion = target?.version;

  useEffect(() => {
    if (!isFetched || !conversationId || targetId === undefined) return;
    const timer = setTimeout(() => {
      scrollToAttachment({ id: targetId, version: targetVersion });
      clearTarget?.();
      // if the conversation takes longer than 500ms to load, the scroll won't work.
    }, SCROLL_TO_ATTACHMENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isFetched, conversationId, targetId, targetVersion, scrollToAttachment, clearTarget]);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { TriggerMatchResult, AnchorPosition } from './types';
import { getRectAtOffset } from './cursor_rect';

interface UseInlineActionsMenuAnchorOptions {
  readonly triggerMatch: TriggerMatchResult;
  readonly editorRef: React.RefObject<HTMLDivElement>;
  readonly containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Computes the popover anchor position from the active trigger's character
 * offset. Retains the last known position when the trigger becomes inactive
 * so the popover can animate closed in place.
 */
export const useInlineActionsMenuAnchor = ({
  triggerMatch,
  editorRef,
  containerRef,
}: UseInlineActionsMenuAnchorOptions): AnchorPosition | null => {
  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition | null>(null);
  const triggerStartOffset = triggerMatch.activeTrigger?.triggerStartOffset;

  // Update anchor position
  useEffect(() => {
    if (typeof triggerStartOffset !== 'number' || !editorRef.current || !containerRef.current) {
      return;
    }

    const rect = getRectAtOffset(editorRef.current, triggerStartOffset);
    if (!rect) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();

    setAnchorPosition({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
    });
  }, [triggerStartOffset, editorRef, containerRef]);

  return anchorPosition;
};

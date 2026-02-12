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
 * offset. Returns `null` when no trigger is active or the position cannot
 * be resolved.
 */
export const useInlineActionsMenuAnchor = ({
  triggerMatch,
  editorRef,
  containerRef,
}: UseInlineActionsMenuAnchorOptions): AnchorPosition | null => {
  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition | null>(null);

  useEffect(() => {
    if (!triggerMatch.activeTrigger || !editorRef.current || !containerRef.current) {
      return;
    }

    const { triggerStartOffset } = triggerMatch.activeTrigger;
    const rect = getRectAtOffset(editorRef.current, triggerStartOffset);
    if (!rect) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();

    setAnchorPosition({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
    });
  }, [triggerMatch, editorRef, containerRef]);

  return anchorPosition;
};

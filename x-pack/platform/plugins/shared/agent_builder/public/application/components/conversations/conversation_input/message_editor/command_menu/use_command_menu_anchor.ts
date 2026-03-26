/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { CommandMatchResult, AnchorPosition } from './types';
import { getRectAtOffset } from './cursor_rect';

interface UseCommandMenuAnchorOptions {
  readonly commandMatch: CommandMatchResult;
  readonly editorRef: React.RefObject<HTMLDivElement>;
  readonly containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Computes the popover anchor position from the active command's character
 * offset. Retains the last known position when the command becomes inactive
 * so the popover can animate closed in place.
 */
export const useCommandMenuAnchor = ({
  commandMatch,
  editorRef,
  containerRef,
}: UseCommandMenuAnchorOptions): AnchorPosition | null => {
  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition | null>(null);
  const commandStartOffset = commandMatch.activeCommand?.commandStartOffset;

  // Update anchor position
  useEffect(() => {
    if (typeof commandStartOffset !== 'number' || !editorRef.current || !containerRef.current) {
      return;
    }

    const rect = getRectAtOffset(editorRef.current, commandStartOffset);
    if (!rect) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();

    setAnchorPosition({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
    });
  }, [commandStartOffset, editorRef, containerRef]);

  return anchorPosition;
};

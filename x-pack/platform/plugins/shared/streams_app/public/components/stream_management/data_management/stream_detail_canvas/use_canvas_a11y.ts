/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

/** Default selector for the interactive canvas region (set in `canvas_shell.tsx`). */
const CANVAS_CONTAINER_SELECTOR = '[data-test-subj="streamsCanvasTab"]';

interface CanvasKeyboardShortcutsOptions {
  onUndo: () => void;
  onRedo: () => void;
  onEscape: () => void;
  /** Only fire when focus is within this region, so we never hijack global keys. */
  containerSelector?: string;
}

/**
 * Canvas-scoped keyboard shortcuts: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z or
 * Ctrl+Y (redo), and Escape. Guarded to the canvas region so the standard
 * platform shortcuts elsewhere in Kibana are untouched.
 */
export function useCanvasKeyboardShortcuts({
  onUndo,
  onRedo,
  onEscape,
  containerSelector = CANVAS_CONTAINER_SELECTOR,
}: CanvasKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(containerSelector)) {
        return;
      }

      if (event.key === 'Escape') {
        onEscape();
        return;
      }

      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) {
        return;
      }

      const key = event.key.toLowerCase();
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
      const isUndo = key === 'z' && !event.shiftKey;

      if (isRedo) {
        event.preventDefault();
        onRedo();
      } else if (isUndo) {
        event.preventDefault();
        onUndo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onEscape, containerSelector]);
}

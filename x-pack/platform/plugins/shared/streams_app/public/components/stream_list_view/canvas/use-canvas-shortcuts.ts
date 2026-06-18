/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Canvas keyboard shortcuts: ⌘/Ctrl+A select all, ⌘/Ctrl+Z undo,
// ⌘/Ctrl+Shift+Z (or Ctrl+Y) redo.

import { useEffect } from 'react';
import type { Node } from '@xyflow/react';

interface ShortcutDeps {
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  undo: () => void;
  redo: () => void;
}

export function useCanvasShortcuts({ setNodes, undo, redo }: ShortcutDeps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      // Ignored while typing in a field so the browser's native text
      // editing/undo still works there.
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || active?.isContentEditable) return;

      const key = event.key.toLowerCase();
      if (key === 'a') {
        event.preventDefault();
        // Skip routing-endpoint pucks and anything hidden (e.g. filtered out by
        // search) — you shouldn't select what you can't see.
        setNodes((current) =>
          current.map((n) =>
            n.type === 'routingEndpoint' || n.hidden ? n : { ...n, selected: true }
          )
        );
      } else if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setNodes, undo, redo]);
}

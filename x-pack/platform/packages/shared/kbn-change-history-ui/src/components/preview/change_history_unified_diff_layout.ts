/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unified (inline) diff layout selectors — Monaco positions `.editor.original` at left:0
 * with width = max(5px, decorationsLeft). Collapse original and stretch modified to
 * prevent content bleed into the gutter.
 */
export const CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR =
  '& .monaco-diff-editor:not(.side-by-side) .editor.original';

export const CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR =
  '& .monaco-diff-editor:not(.side-by-side) .editor.modified';

export const buildChangeHistoryUnifiedDiffLayoutStyles = (): Record<
  string,
  Record<string, string | number>
> => ({
  [CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR]: {
    width: '0 !important',
    minWidth: '0 !important',
    overflow: 'hidden',
    visibility: 'hidden',
    pointerEvents: 'none',
  },
  [CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR]: {
    left: '0 !important',
    right: '0',
    width: 'auto !important',
  },
});

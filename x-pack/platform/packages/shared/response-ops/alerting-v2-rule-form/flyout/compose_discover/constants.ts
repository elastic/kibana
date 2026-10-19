/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';

export const MIN_EDITOR_HEIGHT = 40;
export const INITIAL_EDITOR_HEIGHT = 100;
export const MAX_EDITOR_HEIGHT = 600;

export const ESQL_EDITOR_LINE_HEIGHT = 22;

/** Monaco options that match Discover's ES|QL editor text style. */
export const ESQL_CODE_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  lineHeight: ESQL_EDITOR_LINE_HEIGHT,
  wordWrap: 'on',
  wrappingIndent: 'none',
  padding: { top: 8, bottom: 8 },
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  // Single-digit line numbers sit flush with the left edge of the controls above the editor.
  // Two-digit numbers widen the gutter, which is rare for a query.
  glyphMargin: false,
  folding: false,
  lineNumbersMinChars: 1,
  // Slim scrollbar and no overview ruler, matching Discover's ES|QL editor.
  hideCursorInOverviewRuler: true,
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  scrollbar: {
    horizontal: 'hidden',
    horizontalScrollbarSize: 6,
    vertical: 'auto',
    verticalScrollbarSize: 6,
    alwaysConsumeMouseWheel: false,
  },
};

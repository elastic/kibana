/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';

/** Read-only Monaco for the single-version view. Folding and glyph margin are off so the gutter width stays stable. */
export const CHANGE_HISTORY_PREVIEW_MONACO_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    readOnly: true,
    domReadOnly: true,
    contextmenu: false,
    minimap: { enabled: false },
    automaticLayout: true,
    lineNumbers: 'on',
    lineNumbersMinChars: 2,
    glyphMargin: false,
    scrollBeyondLastLine: false,
    folding: false,
    showFoldingControls: 'never',
    stickyScroll: { enabled: false },
    tabSize: 2,
    insertSpaces: true,
    fontSize: 14,
    lineHeight: 23,
    renderWhitespace: 'none',
    roundedSelection: false,
    guides: { indentation: true },
    // Monaco draws its own scrollbars, so the EUI scrollbar mixin can't style them.
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    wordWrap: 'on',
    wordWrapColumn: 80,
    wrappingIndent: 'indent',
    padding: { top: 24, bottom: 16 },
    lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    hover: { enabled: 'off' },
    parameterHints: { enabled: false },
  };

/** Global editor options applied to diff child editors via `updateOptions`. */
export const CHANGE_HISTORY_DIFF_GLOBAL_EDITOR_OPTIONS: Pick<
  monaco.editor.IGlobalEditorOptions,
  'tabSize' | 'insertSpaces'
> = {
  tabSize: 2,
  insertSpaces: true,
};

/** Shared read-only diff defaults. */
export const CHANGE_HISTORY_DIFF_MONACO_BASE_OPTIONS: monaco.editor.IStandaloneDiffEditorConstructionOptions =
  {
    ...CHANGE_HISTORY_PREVIEW_MONACO_OPTIONS,
    renderOverviewRuler: false,
    overviewRulerLanes: 0,
    renderIndicators: false,
    renderMarginRevertIcon: false,
    hideUnchangedRegions: { enabled: false },
  };

/** Inline unified diff: no gutter; original pane is hidden via preview CSS. */
export const CHANGE_HISTORY_UNIFIED_DIFF_EDITOR_OPTIONS: monaco.editor.IEditorOptions = {
  lineNumbers: 'off',
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
};

/** Inline unified diff: modified pane shows line numbers (original is hidden). */
export const CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS: monaco.editor.IEditorOptions = {
  lineNumbers: 'on',
  lineNumbersMinChars: 2,
  lineDecorationsWidth: 24,
};

/** Side-by-side diff: show line numbers in each pane. */
export const CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS: monaco.editor.IEditorOptions = {
  lineNumbers: 'on',
  // Numbers are right-aligned, so a larger minimum width adds space to their left.
  lineNumbersMinChars: 4,
  // Wider than Monaco default (10) so +/- diff indicators are not flush with line numbers.
  lineDecorationsWidth: 24,
};

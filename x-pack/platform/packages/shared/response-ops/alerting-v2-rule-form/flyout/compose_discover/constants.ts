/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_LANG_ID, type monaco } from '@kbn/code-editor';

export const MIN_EDITOR_HEIGHT = 40;
export const INITIAL_EDITOR_HEIGHT = 100;
export const MAX_EDITOR_HEIGHT = 600;

export const ESQL_EDITOR_LINE_HEIGHT = 22;

/** Monaco options that match Discover's ES|QL editor text style. */
export const ESQL_CODE_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  theme: ESQL_LANG_ID,
  fontSize: 14,
  lineHeight: ESQL_EDITOR_LINE_HEIGHT,
  wordWrap: 'on',
  wrappingIndent: 'none',
  padding: { top: 8, bottom: 8 },
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodeEditorProps } from '@kbn/code-editor';

/**
 * The unique identifier for the Expressions Language for use in the ExpressionInput
 * and CodeEditor components.
 */
export const EXPRESSIONS_LANGUAGE_ID = 'kibana-expressions';

export const LANGUAGE_CONFIGURATION = {
  autoClosingPairs: [
    {
      open: '{',
      close: '}',
    },
  ],
};

export const CODE_EDITOR_OPTIONS: CodeEditorProps['options'] = {
  scrollBeyondLastLine: false,
  quickSuggestions: true,
  minimap: {
    enabled: false,
  },
  wordWrap: 'on',
  wrappingIndent: 'indent',
};

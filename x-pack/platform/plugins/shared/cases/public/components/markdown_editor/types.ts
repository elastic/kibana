/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextShape } from '@elastic/eui/src/components/markdown_editor/markdown_context';
export interface CursorPosition {
  start: number;
  end: number;
}

export interface MarkdownEditorRef {
  textarea: HTMLTextAreaElement | null;
  replaceNode: ContextShape['replaceNode'];
  toolbar: HTMLDivElement | null;
}

export interface EditorBaseProps {
  ariaLabel: string;
  'data-test-subj': string;
  editorId: string;
  disabledUiPlugins?: string[];
  errors?: Array<string | Error>;
}

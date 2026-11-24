/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import type { ReasonTemplateVariable } from './reason_template_variables';

// Text right before the cursor that sits inside an open `{{ ... ` expression. The capture group is
// the word being typed, so the suggestion replaces it.
const OPEN_EXPRESSION = /\{\{-?\s*([\w.@]*)$/;

interface CreateReasonCompletionProviderOptions {
  /** Read on every request, so it sees the columns of the query as they are now. */
  getVariables: () => readonly ReasonTemplateVariable[];
  /** Only this model gets suggestions: the `liquid` language is shared with other editors. */
  getModel: () => monaco.editor.ITextModel | null;
}

export const createReasonCompletionProvider = ({
  getVariables,
  getModel,
}: CreateReasonCompletionProviderOptions): monaco.languages.CompletionItemProvider => ({
  triggerCharacters: ['{', ' ', '.'],
  provideCompletionItems(model, position) {
    if (model !== getModel()) {
      return { suggestions: [] };
    }

    const textUpToCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
    const match = OPEN_EXPRESSION.exec(textUpToCursor);
    if (!match) {
      return { suggestions: [] };
    }

    const typed = match[1];
    const range: monaco.IRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - typed.length,
      endColumn: position.column,
    };

    return {
      suggestions: getVariables().map(({ expression, detail }) => ({
        label: expression,
        kind: monaco.languages.CompletionItemKind.Variable,
        detail,
        insertText: expression,
        range,
      })),
    };
  },
});

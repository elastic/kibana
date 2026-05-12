/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import type { PayloadVariable } from '../registry';
import { DISPATCH_PAYLOAD_VARIABLES } from '../registry';

const TEMPLATE_OPEN = '{{';
const TEMPLATE_CLOSE = '}}';

const isInsideTemplate = (textUpToCursor: string): boolean => {
  const lastOpen = textUpToCursor.lastIndexOf(TEMPLATE_OPEN);
  if (lastOpen === -1) return false;
  const lastClose = textUpToCursor.lastIndexOf(TEMPLATE_CLOSE);
  return lastClose < lastOpen;
};

const getCurrentToken = (textUpToCursor: string): string => {
  const match = textUpToCursor.match(/([A-Za-z0-9_.[\]]*)$/);
  return match ? match[1] : '';
};

const buildItem = (
  variable: PayloadVariable,
  range: monaco.IRange
): monaco.languages.CompletionItem => ({
  label: variable.path,
  kind: monaco.languages.CompletionItemKind.Variable,
  detail: variable.detail,
  documentation: variable.documentation,
  insertText: variable.path,
  range,
});

export const createPayloadCompletionProvider = (
  variables: readonly PayloadVariable[] = DISPATCH_PAYLOAD_VARIABLES
): monaco.languages.CompletionItemProvider => ({
  triggerCharacters: ['{', '.'],
  provideCompletionItems(model, position) {
    const lineContent = model.getLineContent(position.lineNumber);
    const textUpToCursor = lineContent.slice(0, position.column - 1);

    if (!isInsideTemplate(textUpToCursor)) {
      return { suggestions: [] };
    }

    const currentToken = getCurrentToken(textUpToCursor);
    const range: monaco.IRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - currentToken.length,
      endColumn: position.column,
    };

    return { suggestions: variables.map((variable) => buildItem(variable, range)) };
  },
});

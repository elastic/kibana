/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import { parseLineForCompletion } from '@kbn/workflows-yaml';
import { INPUTS } from '../constants';
import type { PayloadVariable } from '../registry';
import { getContextVariables } from '../registry';

const buildItem = (
  variable: PayloadVariable,
  range: monaco.IRange,
  prefix = ''
): monaco.languages.CompletionItem => ({
  label: prefix + variable.path,
  kind: monaco.languages.CompletionItemKind.Variable,
  detail: variable.detail,
  documentation: variable.documentation,
  insertText: prefix + variable.path,
  range,
});

// Returns the "parent path" — the path segments that represent the already-completed context.
// When lastPathSegment is non-null the user is mid-word, so strip that partial from the end.
const getParentPath = (pathSegments: string[] | null, lastPathSegment: string | null): string[] => {
  if (pathSegments === null) return [];
  return lastPathSegment === null ? pathSegments : pathSegments.slice(0, -1);
};

// With no path typed yet, suggest every input field under its full `inputs.<input>.` prefix.
const getTopLevelItems = (range: monaco.IRange): monaco.languages.CompletionItem[] =>
  getContextVariables([INPUTS]).flatMap(({ path: input }) =>
    getContextVariables([INPUTS, input]).map((variable) =>
      buildItem(variable, range, `${INPUTS}.${input}.`)
    )
  );

export const createPayloadCompletionProvider = (): monaco.languages.CompletionItemProvider => ({
  triggerCharacters: ['{', '.'],
  provideCompletionItems(model, position) {
    const lineContent = model.getLineContent(position.lineNumber);
    const textUpToCursor = lineContent.slice(0, position.column - 1);
    const parseResult = parseLineForCompletion(textUpToCursor);

    if (
      !parseResult ||
      (parseResult.matchType !== 'variable-unfinished' &&
        parseResult.matchType !== 'variable-complete' &&
        parseResult.matchType !== 'at')
    ) {
      return { suggestions: [] };
    }

    const { pathSegments, lastPathSegment } = parseResult;
    const parent = getParentPath(pathSegments, lastPathSegment);
    const lastSegmentLen = lastPathSegment?.length ?? 0;
    const range: monaco.IRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - lastSegmentLen,
      endColumn: position.column,
    };

    if (parent.length === 0) {
      return { suggestions: getTopLevelItems(range) };
    }
    return {
      suggestions: getContextVariables(parent).map((variable) => buildItem(variable, range)),
    };
  },
});

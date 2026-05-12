/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import { parseLineForCompletion } from '@kbn/workflows-management-plugin/public';
import type { PayloadVariable } from '../registry';
import { DISPATCH_PAYLOAD_VARIABLES, ALERT_EPISODE_FIELDS } from '../registry';

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

const isEpisodeContext = (pathSegments: string[] | null): boolean =>
  pathSegments !== null &&
  pathSegments.length >= 2 &&
  pathSegments[0] === 'episodes' &&
  /^\d+$/.test(pathSegments[1]);

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
    const lastSegmentLen = lastPathSegment?.length ?? 0;
    const range: monaco.IRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - lastSegmentLen,
      endColumn: position.column,
    };

    const candidates = isEpisodeContext(pathSegments)
      ? ALERT_EPISODE_FIELDS
      : DISPATCH_PAYLOAD_VARIABLES;
    return { suggestions: candidates.map((variable) => buildItem(variable, range)) };
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import { parseLineForCompletion } from '@kbn/workflows-yaml';
import type { PayloadVariable } from '../registry';
import { DISPATCH_PAYLOAD_VARIABLES, ALERT_EPISODE_FIELDS } from '../registry';

// All dispatcher payload variables are nested under `context.inputs.payload` at render time.
const TOP_LEVEL_PREFIX = 'inputs.payload.';

// The single wrapper key exposed directly under `inputs`.
const PAYLOAD_WRAPPER: readonly PayloadVariable[] = [
  {
    path: 'payload',
    detail: 'object',
    documentation: 'Dispatcher payload for the action group.',
  },
];

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

const isEpisodeContext = (parent: string[]): boolean =>
  parent.length >= 4 &&
  parent[0] === 'inputs' &&
  parent[1] === 'payload' &&
  parent[2] === 'episodes' &&
  /^\d+$/.test(parent[3]);

const isPayloadContext = (parent: string[]): boolean =>
  parent.length === 2 && parent[0] === 'inputs' && parent[1] === 'payload';

const isInputsContext = (parent: string[]): boolean =>
  parent.length === 1 && parent[0] === 'inputs';

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

    let candidates: readonly PayloadVariable[];
    let prefix = '';
    if (isEpisodeContext(parent)) {
      candidates = ALERT_EPISODE_FIELDS;
    } else if (isPayloadContext(parent)) {
      candidates = DISPATCH_PAYLOAD_VARIABLES;
    } else if (isInputsContext(parent)) {
      candidates = PAYLOAD_WRAPPER;
    } else if (parent.length === 0) {
      candidates = DISPATCH_PAYLOAD_VARIABLES;
      prefix = TOP_LEVEL_PREFIX;
    } else {
      return { suggestions: [] };
    }
    return { suggestions: candidates.map((variable) => buildItem(variable, range, prefix)) };
  },
});

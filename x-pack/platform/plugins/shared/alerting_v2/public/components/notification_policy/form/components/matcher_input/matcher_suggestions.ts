/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MATCHER_CONTEXT_FIELDS,
  type MatcherContextFieldDescriptor,
} from '@kbn/alerting-v2-schemas';

const KQL_OPERATORS = new Set(['and', 'or', 'not']);
const TOKEN_DELIMITERS = /[\s:()"]/;

const FIELDS_BY_PATH = new Map<string, MatcherContextFieldDescriptor>(
  MATCHER_CONTEXT_FIELDS.map((f) => [f.path, f])
);

export interface TokenInfo {
  token: string;
  start: number;
  end: number;
}

export interface SuggestionItem {
  label: string;
  description?: string;
  type?: string;
  insertText: string;
}

export const extractCurrentToken = (value: string, cursorPos: number): TokenInfo | null => {
  if (cursorPos === 0 || value.length === 0) {
    return null;
  }

  let start = cursorPos;
  while (start > 0 && !TOKEN_DELIMITERS.test(value[start - 1])) {
    start--;
  }

  let end = cursorPos;
  while (end < value.length && !TOKEN_DELIMITERS.test(value[end])) {
    end++;
  }

  const token = value.slice(start, end);
  if (token.length === 0 || KQL_OPERATORS.has(token.toLowerCase())) {
    return null;
  }

  return { token, start, end };
};

const FIELD_COLON_PATTERN = /(\S+)\s*:\s*$/;

export const detectValueContext = (
  value: string,
  cursorPos: number
): { fieldPath: string; insertPos: number } | null => {
  const textBeforeCursor = value.slice(0, cursorPos);
  const match = FIELD_COLON_PATTERN.exec(textBeforeCursor);
  if (!match) return null;

  const fieldPath = match[1];
  if (!FIELDS_BY_PATH.has(fieldPath)) return null;

  const field = FIELDS_BY_PATH.get(fieldPath)!;
  if (!field.values) return null;

  return { fieldPath, insertPos: cursorPos };
};

export const getFieldSuggestions = (token: string): SuggestionItem[] => {
  const lower = token.toLowerCase();
  return MATCHER_CONTEXT_FIELDS.filter((f) => f.path.toLowerCase().startsWith(lower)).map((f) => ({
    label: f.path,
    description: f.description,
    type: f.type,
    insertText: f.path,
  }));
};

export const getValueSuggestions = (fieldPath: string, token: string): SuggestionItem[] => {
  const field = FIELDS_BY_PATH.get(fieldPath);
  if (!field?.values) return [];

  const lower = token.toLowerCase();
  const quote = field.type === 'boolean' ? '' : '"';
  return field.values
    .filter((v) => v.toLowerCase().startsWith(lower))
    .map((v) => ({
      label: `${quote}${v}${quote}`,
      description: `${fieldPath} value`,
      insertText: `${quote}${v}${quote}`,
    }));
};

export const computeSuggestions = (
  input: string,
  cursorPos: number
): { suggestions: SuggestionItem[]; token: TokenInfo | null; isValueMode: boolean } => {
  const valueCtx = detectValueContext(input, cursorPos);

  if (valueCtx) {
    const token: TokenInfo = { token: '', start: cursorPos, end: cursorPos };
    return { suggestions: getValueSuggestions(valueCtx.fieldPath, ''), token, isValueMode: true };
  }

  const tokenInfo = extractCurrentToken(input, cursorPos);
  if (tokenInfo) {
    return {
      suggestions: getFieldSuggestions(tokenInfo.token),
      token: tokenInfo,
      isValueMode: false,
    };
  }

  return { suggestions: [], token: null, isValueMode: false };
};

export const applyInsertText = (
  currentValue: string,
  token: TokenInfo,
  insertText: string
): { newValue: string; newCursorPos: number } => {
  const before = currentValue.slice(0, token.start);
  const after = currentValue.slice(token.end);
  return {
    newValue: before + insertText + after,
    newCursorPos: token.start + insertText.length,
  };
};

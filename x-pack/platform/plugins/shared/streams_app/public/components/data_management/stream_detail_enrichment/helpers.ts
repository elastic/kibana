/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { hasUnclosedQuote } from 'src/platform/plugins/shared/console/public/application/containers/editor/utils/autocomplete_utils';
import { parseBody } from 'src/platform/plugins/shared/console/public/application/containers/editor/utils/tokens_utils';

import type { JsonValue } from '@kbn/utility-types';
export type ProcessorSuggestion = { name: string; template?: JsonValue };

export const serializeXJson = (v: unknown, defaultVal: string = '{}') => {
  if (!v) {
    return defaultVal;
  }
  if (typeof v === 'string') {
    try {
      const obj = JSON.parse(XJson.collapseLiteralStrings(v));
      return XJson.expandLiteralStrings(JSON.stringify(obj, null, 2));
    } catch {
      return formatXJsonString(v);
    }
  }
  return XJson.expandLiteralStrings(JSON.stringify(v, null, 2));
};

export const deserializeJson = (input: string) => {
  try {
    return JSON.parse(input);
  } catch (e) {
    return input;
  }
};

export const parseXJsonOrString = (input: string): unknown => {
  try {
    return JSON.parse(XJson.collapseLiteralStrings(input));
  } catch {
    return input;
  }
};

/**
 * Format a XJson string input as parsed JSON. Replaces the invalid characters
 *  with a placeholder, parses the new string in a JSON format with the expected
 * indentantion and then replaces the placeholders with the original values.
 */
const formatXJsonString = (input: string) => {
  let placeholder = 'PLACEHOLDER';
  const INVALID_STRING_REGEX = /"""(.*?)"""/gs;
  while (input.includes(placeholder)) {
    placeholder += '_';
  }
  const modifiedInput = input.replace(INVALID_STRING_REGEX, () => `"${placeholder}"`);

  let jsonObject;
  try {
    jsonObject = JSON.parse(modifiedInput);
  } catch (error) {
    return input;
  }
  let formattedJsonString = JSON.stringify(jsonObject, null, 2);
  const invalidStrings = input.match(INVALID_STRING_REGEX);
  if (invalidStrings) {
    invalidStrings.forEach((invalidString) => {
      formattedJsonString = formattedJsonString.replace(`"${placeholder}"`, invalidString);
    });
  }
  return formattedJsonString;
};



export const hasOddQuoteCount = (text: string) => hasUnclosedQuote(text);


export const buildProcessorInsertText = (
  name: string,
  template: JsonValue | undefined,
  alreadyOpenedQuote: boolean
): string => {
  let insertText = alreadyOpenedQuote ? `${name}"` : `"${name}"`;

  if (template) {
    const json = typeof template === 'string' ? template : JSON.stringify(template, null, 2);
    insertText += `: ${json}`;
  } else {
    insertText += ': {}';
  }

  if (insertText.endsWith('{}')) insertText = insertText.slice(0, -2) + '{$0}';
  if (insertText.endsWith('[]')) insertText = insertText.slice(0, -2) + '[$0]';

  return insertText;
};

const ALLOWED_TOKEN_PATHS: string[][] = [
  ['{', 'processors', '[', '{'],
  ['{', 'processors', '[', '{', 'on_failure', '[', '{'],
];

const tokensEndWithPath = (tokens: string[], path: string[]) =>
  tokens.length >= path.length &&
  path.every((value, index) => tokens[tokens.length - path.length + index] === value);

export const shouldSuggestProcessorKey = (
  lineBeforeCursor: string,
  nearbyContextBeforeCursor: string
): boolean => {
  const trimmedLine = lineBeforeCursor.trimEnd();
  if (!trimmedLine.endsWith('"')) {
    return false;
  }

  if (hasUnclosedQuote(lineBeforeCursor)) {
    return false;
  }

  const tripleQuoteCount = (nearbyContextBeforeCursor.match(/"""/g) || []).length;
  if (tripleQuoteCount % 2 === 1) {
    return false;
  }

  const lastQuoteIndex = trimmedLine.lastIndexOf('"');
  const prevChar = lastQuoteIndex > 0 ? trimmedLine[lastQuoteIndex - 1] : '';
  if (!['{', ',', '[', ''].includes(prevChar)) {
    return false;
  }

  const lastColon = trimmedLine.lastIndexOf(':');
  if (lastColon > lastQuoteIndex) {
    return false;
  }

  const wrapped = `{"processors": ${nearbyContextBeforeCursor}}`;
  try {
    const tokens = parseBody(wrapped);
    return ALLOWED_TOKEN_PATHS.some((path) => tokensEndWithPath(tokens, path));
  } catch {
    return false;
  }
};

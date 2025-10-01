/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { XJson } from '@kbn/es-ui-shared-plugin/public';

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



export const hasOddQuoteCount = (text: string) => ((text.match(/\"/g) || []).length % 2) === 1;


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

export const shouldSuggestProcessorKey = (
  lineBeforeCursor: string,
  nearbyContextBeforeCursor: string
): boolean => {
  const tripleQuoteCount = (lineBeforeCursor.match(/"""/g) || []).length;
  if (tripleQuoteCount % 2 === 1) return false;

  const trimmedEnd = lineBeforeCursor.trimEnd();
  if (!trimmedEnd.endsWith('"')) return false;

  let i = lineBeforeCursor.length - 2;
  while (i >= 0 && /\s/.test(lineBeforeCursor[i])) i--;
  const prev = i >= 0 ? lineBeforeCursor[i] : '';

  const lastColon = nearbyContextBeforeCursor.lastIndexOf(':');
  const lastQuote = nearbyContextBeforeCursor.lastIndexOf('"');
  if (lastColon !== -1 && lastColon > lastQuote) return false;

  const lastOpenBracket = nearbyContextBeforeCursor.lastIndexOf('[');
  const lastCloseBracket = nearbyContextBeforeCursor.lastIndexOf(']');
  if (lastOpenBracket !== -1 && lastOpenBracket > lastCloseBracket) {
    const colonBeforeBracket = nearbyContextBeforeCursor.lastIndexOf(':', lastOpenBracket);
    if (colonBeforeBracket !== -1) return false;
  }

  return prev === '{' || prev === '[' || prev === ',' || prev === '';
};

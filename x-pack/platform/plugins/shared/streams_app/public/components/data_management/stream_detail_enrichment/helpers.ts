/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpStart } from '@kbn/core/public';
import { XJson } from '@kbn/es-ui-shared-plugin/public';
import type { JsonValue } from '@kbn/utility-types';
import type { ProcessorSuggestion } from '@kbn/streams-plugin/common';

const PROCESSOR_SUGGESTIONS_API = '/internal/streams/ingest/processor_suggestions';
let suggestionsPromise: Promise<ProcessorSuggestion[]> | null = null;

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

export const fetchProcessorSuggestions = (http: HttpStart): Promise<ProcessorSuggestion[]> => {
  if (suggestionsPromise) return suggestionsPromise;

  const fetchPromise = http
    .get<ProcessorSuggestion[]>(PROCESSOR_SUGGESTIONS_API)
    .then((result) => result ?? [])
    .catch(() => []);

  suggestionsPromise = fetchPromise.then((result) => {
    if (result.length === 0) {
      suggestionsPromise = null;
    }
    return result;
  });

  return suggestionsPromise;
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

export const hasOddQuoteCount = (text: string) => {
  const matches = text.match(/(?<!\\)"/g);
  return (matches?.length ?? 0) % 2 === 1;
};

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
  const trimmedLine = lineBeforeCursor.trimEnd();
  if (!trimmedLine.endsWith('"')) {
    return false;
  }

  const tripleQuoteCount = (nearbyContextBeforeCursor.match(/"""/g) || []).length;
  if (tripleQuoteCount % 2 === 1) {
    return false;
  }

  const lastQuoteGlobal = nearbyContextBeforeCursor.lastIndexOf('"');
  if (lastQuoteGlobal === -1) return false;
  let i = lastQuoteGlobal - 1;
  let prev: string | null = null;
  while (i >= 0) {
    const ch = nearbyContextBeforeCursor[i];
    if (!/\s/.test(ch)) {
      prev = ch;
      break;
    }
    i--;
  }

  if (prev === ':') return false;
  if (prev === '[') return false;
  if (prev === '{' || prev === ',' || prev === null) return true;

  return false;
};

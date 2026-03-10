/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { XJson } from '@kbn/es-ui-shared-plugin/public';
import type { monaco } from '@kbn/monaco';
import type { JsonValue } from '@kbn/utility-types';
import type { ProcessorSuggestionsResponse } from '@kbn/streams-plugin/common';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';

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

export const fetchProcessorSuggestions = async (
  streamsRepositoryClient: StreamsRepositoryClient,
  signal: AbortSignal
): Promise<ProcessorSuggestionsResponse> => {
  try {
    const result = await streamsRepositoryClient.fetch(
      'GET /internal/streams/ingest/processor_suggestions',
      { signal }
    );
    return result ?? { processors: [], propertiesByProcessor: {} };
  } catch {
    return { processors: [], propertiesByProcessor: {} };
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

  if (template !== undefined) {
    const json =
      typeof template === 'string' ? JSON.stringify(template) : JSON.stringify(template, null, 2);
    insertText += `: ${json}`;
  } else {
    insertText += ': {}';
  }

  if (insertText.endsWith('{}')) insertText = insertText.slice(0, -2) + '{$0}';
  if (insertText.endsWith('[]')) insertText = insertText.slice(0, -2) + '[$0]';

  return insertText;
};

export const buildPropertyInsertText = (
  propertyName: string,
  propertyTemplate: JsonValue | undefined,
  isQuoteOpen: boolean
): string => {
  let insertText = isQuoteOpen ? `${propertyName}"` : `"${propertyName}"`;

  if (propertyTemplate !== undefined) {
    const json =
      typeof propertyTemplate === 'string'
        ? JSON.stringify(propertyTemplate)
        : JSON.stringify(propertyTemplate, null, 2);
    insertText += `: ${json}`;
  } else {
    insertText += ': {}';
  }

  if (insertText.endsWith('{}')) insertText = insertText.slice(0, -2) + '{$0}';
  if (insertText.endsWith('[]')) insertText = insertText.slice(0, -2) + '[$0]';

  return insertText;
};

export const detectProcessorContext = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  knownProcessors: string[]
): { kind: 'processorKey' | 'processorProperty'; processorName?: string } => {
  // Limit the scan window for performance
  const startLineNumber = Math.max(1, position.lineNumber - 120);
  const text = model.getValueInRange({
    startLineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  // If inside triple-quoted string, only suggest processor keys
  if ((text.match(/"""/g) || []).length % 2 === 1) {
    return { kind: 'processorKey' };
  }

  interface Frame {
    type: '{' | '[';
    owner?: string;
  }
  const stack: Frame[] = [];
  let pendingOwner: string | undefined;

  const readString = (from: number): { end: number; content: string } => {
    for (let i = from + 1; i < text.length; i++) {
      if (text[i] === '"' && text[i - 1] !== '\\') {
        return { end: i, content: text.slice(from + 1, i) };
      }
    }
    return { end: text.length, content: text.slice(from + 1) };
  };

  const skipWs = (from: number): number => {
    let i = from;
    while (i < text.length && /\s/.test(text[i])) i++;
    return i;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      const { end, content } = readString(i);
      const afterString = skipWs(end + 1);
      if (text[afterString] === ':') {
        const afterColon = skipWs(afterString + 1);
        pendingOwner = text[afterColon] === '{' ? content : undefined;
      }
      i = end;
      continue;
    }

    if (ch === '{') {
      const owner =
        pendingOwner && knownProcessors.includes(pendingOwner) ? pendingOwner : undefined;
      stack.push({ type: '{', owner });
      pendingOwner = undefined;
      continue;
    }

    if (ch === '[') {
      stack.push({ type: '[' });
      pendingOwner = undefined;
      continue;
    }

    if (ch === '}' || ch === ']') {
      stack.pop();
      pendingOwner = undefined;
      continue;
    }
  }

  const top = stack[stack.length - 1];
  if (top?.type === '{' && top.owner && knownProcessors.includes(top.owner)) {
    return { kind: 'processorProperty', processorName: top.owner };
  }
  return { kind: 'processorKey' };
};

export const shouldSuggestProcessorKey = (
  lineBeforeCursor: string,
  nearbyContextBeforeCursor: string
): boolean => {
  const tripleQuoteCount = (nearbyContextBeforeCursor.match(/"""/g) || []).length;
  if (tripleQuoteCount % 2 === 1) return false;

  const trimmed = lineBeforeCursor.trimEnd();
  if (!trimmed.endsWith('"')) return false;

  let i = trimmed.length - 2;
  while (i >= 0 && /\s/.test(trimmed[i])) i--;
  const prev = i >= 0 ? trimmed[i] : null;
  if (prev === ':' || prev === '[') return false;
  return prev === '{' || prev === ',' || prev === null;
};

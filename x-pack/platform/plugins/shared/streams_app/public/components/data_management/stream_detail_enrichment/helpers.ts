/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { JsonValue } from '@kbn/utility-types';

const CONSOLE_API_SERVER = '/api/console/api_server';

type ProcessorDef = { __template?: JsonValue };
type ProcessorEntry = Record<string, ProcessorDef>;
type DataAutocompleteRules = { processors?: Array<{ __one_of?: ProcessorEntry[] }> };
type IngestPutPipelineEndpoint = { data_autocomplete_rules?: DataAutocompleteRules };

export type ProcessorSuggestion = { name: string; template?: JsonValue };

let processorsCache: ProcessorSuggestion[] | null = null;

export const serializeXJson = (v: unknown, defaultVal: string = '{}') => {
  if (!v) {
    return defaultVal;
  }
  if (typeof v === 'string') {
    return formatXJsonString(v);
  }
  return JSON.stringify(v, null, 2);
};

export const deserializeJson = (input: string) => {
  try {
    return JSON.parse(input);
  } catch (e) {
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




export const loadProcessorSuggestions = async (http: HttpStart): Promise<ProcessorSuggestion[]> => {

  if (processorsCache) {
    return processorsCache;
  }
  try {
    const res = await http.get<{ es?: { endpoints?: Record<string, unknown> } }>(CONSOLE_API_SERVER);
    const endpoints = res?.es?.endpoints ?? {};
    const ingest = endpoints['ingest.put_pipeline'] as IngestPutPipelineEndpoint | undefined;
    const rules = ingest?.data_autocomplete_rules;
    const oneOf = rules?.processors?.[0]?.__one_of as ProcessorEntry[] | undefined;
    if (!oneOf) {
      processorsCache = [];
      return processorsCache;
    }
    processorsCache = oneOf.map((entry: ProcessorEntry) => {
      const name = Object.keys(entry)[0];
      const def = entry[name] as ProcessorDef;
      const template = def?.__template;
      return { name, template };
    });
    return processorsCache;
  } catch {
    processorsCache = [];
    return processorsCache;
  }
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

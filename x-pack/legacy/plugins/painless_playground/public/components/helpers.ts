/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request } from './types';

export function parseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

export function buildRequestPayload(
  code: string,
  context: string,
  contextSetup: Record<string, string>
) {
  const request: Request = {
    script: {
      source: code,
    },
  };
  if (contextSetup.params) {
    request.script.params = parseJSON(contextSetup?.params);
  }
  if (context === 'filter' || context === 'score') {
    request.context = context;
    request.context_setup = {
      index: contextSetup.index,
      document: parseJSON(contextSetup.doc),
    };
    return request;
  }

  return request;
}

export function getFromLocalStorage(key: string, defaultValue: any = '', parse = false) {
  const value = localStorage.getItem(key);
  if (value && parse) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return defaultValue;
    }
  } else if (value) {
    return value;
  } else {
    return defaultValue;
  }
}

export function formatJson(json: any): string {
  try {
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return `Invalid JSON ${String(json)}`;
  }
}

export function formatExecutionError(json: object) {
  if (json.script_stack && json.caused_by) {
    return `Unhandled Exception ${json.caused_by.type}

${json.caused_by.reason}

Located at:
${formatJson(json.script_stack)}
`;
  }
  return formatJson(json);
}

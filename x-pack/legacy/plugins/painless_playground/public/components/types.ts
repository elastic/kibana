/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export interface Request {
  script: {
    source: string;
    params?: Record<string, unknown>;
  };
  context?: string;
  context_setup?: {
    document: Record<string, unknown>;
    index: string;
  };
}

export interface Response {
  error?: ExecutionError;
  result?: string;
}

export type ExecutionErrorScriptStack = string[];

export interface ExecutionError {
  script_stack?: ExecutionErrorScriptStack;
  caused_by?: {
    type: string;
    reason: string;
  };
  message?: string;
}

export type JsonArray = JsonValue[];
export type JsonValue = null | boolean | number | string | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

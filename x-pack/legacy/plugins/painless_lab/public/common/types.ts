/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ContextSetup {
  params?: any;
  document: Record<string, unknown>;
  index: string;
}

// This should be an enumerated list
export type Context = string;

export interface Script {
  source: string;
  params?: Record<string, unknown>;
}

export interface Request {
  script: Script;
  context?: Context;
  context_setup?: ContextSetup;
}

export interface Response {
  error?: ExecutionError | Error;
  result?: string;
}

export type ExecutionErrorScriptStack = string[];

export interface ExecutionErrorPosition {
  start: number;
  end: number;
  offset: number;
}

export interface ExecutionError {
  script_stack?: ExecutionErrorScriptStack;
  caused_by?: {
    type: string;
    reason: string;
  };
  message?: string;
  position: ExecutionErrorPosition;
  script: string;
}

export type JsonArray = JsonValue[];
export type JsonValue = null | boolean | number | string | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type ContextChangeHandler = (change: {
  context?: Partial<Context>;
  contextSetup?: Partial<ContextSetup>;
}) => void;

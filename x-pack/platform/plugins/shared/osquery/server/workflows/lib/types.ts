/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The part of the step `contextManager` the osquery steps use. */
export interface KibanaApiCaller {
  callKibanaApi<T = unknown>(params: {
    method: 'GET' | 'POST';
    path: string;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
  }): Promise<{ status: number; body: T }>;
}

/** The part of the step logger the osquery steps use. */
export interface StepLogger {
  warn(message: string): void;
}

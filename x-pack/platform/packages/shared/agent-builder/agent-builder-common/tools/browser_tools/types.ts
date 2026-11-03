/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

//
// eslint-disable-next-line @kbn/eslint/module_migration
import type { JSONSchema } from 'zod/v4/core/json-schema';

export const DEFAULT_BROWSER_TOOL_TIMEOUT_MS = 30_000;

/** Serializable description of a tool whose handler runs in the browser. */
export interface BrowserToolDescriptor {
  id: string;
  description: string;
  schema: JSONSchema;
  timeout_ms?: number;
}

/** Browser-side tools the sending client can execute. */
export interface BrowserToolsRequest {
  client_id: string;
  tool_ids: string[];
}

export interface BrowserToolImagePayload {
  mime_type: 'image/png' | 'image/jpeg';
  base64: string;
  name?: string;
  description?: string;
}

export type BrowserToolResultPayload =
  | {
      status: 'ok';
      content?: string | Record<string, unknown>;
      images?: BrowserToolImagePayload[];
    }
  | { status: 'error'; message: string };

export enum BrowserToolCallStatus {
  pending = 'pending',
  answered = 'answered',
  consumed = 'consumed',
  expired = 'expired',
}

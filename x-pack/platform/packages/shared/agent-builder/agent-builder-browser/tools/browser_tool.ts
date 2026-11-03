/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zodToBrowserToolSchema, type BrowserToolDescriptor } from '@kbn/agent-builder-common';
import type { ZodType } from '@kbn/zod/v4';

/**
 * Context passed to a browser tool handler when the server requests a call.
 */
export interface BrowserToolCallContext {
  toolId: string;
  toolCallId: string;
  executionId: string;
  conversationId?: string;
  agentId: string;
  /** Aborted when the call times out or is cancelled. */
  signal: AbortSignal;
}

export interface BrowserToolImage {
  mimeType: 'image/png' | 'image/jpeg';
  base64: string;
  name?: string;
  description?: string;
}

/** Value a browser tool handler may return to the agent. */
export interface BrowserToolHandlerReturn {
  content?: string | Record<string, unknown>;
  images?: BrowserToolImage[];
}

/**
 * Definition of a tool whose handler runs in the browser when requested by the agent.
 */
export interface BrowserToolDefinition<TParams = unknown> {
  /**
   * Unique identifier for the tool. Must match `^[a-zA-Z0-9_-]+$` (no dots).
   */
  id: string;
  /** Description provided to the LLM. */
  description: string;
  /** Zod schema of the tool parameters. Use `.describe()` on fields. */
  schema: ZodType<TParams>;
  /** Optional timeout (ms) for the call. */
  timeoutMs?: number;
  /** Executes in the browser with validated params. */
  handler: (
    params: TParams,
    context: BrowserToolCallContext
  ) => void | BrowserToolHandlerReturn | Promise<void | BrowserToolHandlerReturn>;
}

export const toBrowserToolDescriptor = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  def: BrowserToolDefinition<any>
): BrowserToolDescriptor => ({
  id: def.id,
  description: def.description,
  schema: zodToBrowserToolSchema(def.schema),
  ...(def.timeoutMs !== undefined ? { timeout_ms: def.timeoutMs } : {}),
});

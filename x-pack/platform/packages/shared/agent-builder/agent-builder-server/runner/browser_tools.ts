/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  BrowserToolCallStatus,
  BrowserToolDescriptor,
  BrowserToolImagePayload,
  BrowserToolResultPayload,
  ImageResult,
} from '@kbn/agent-builder-common';
import type { AttachmentStateManager } from '../attachments/attachment_state_manager';

/** Stored browser tool call document. */
export interface BrowserToolCallRecord {
  execution_id: string;
  tool_call_id: string;
  client_id?: string;
  space_id: string;
  tool_id: string;
  status: BrowserToolCallStatus;
  created_at: string;
  expires_at: string;
  result?: BrowserToolResultPayload;
}

export type BrowserToolCallAnswerOutcome = 'accepted' | 'not_found' | 'rejected';

export type BrowserToolCallSetStatusOutcome = 'applied' | 'skipped';

/**
 * Persistence client for browser tool calls, as exposed to the agent loop.
 */
export interface BrowserToolCallClientContract {
  /** Create a pending call document. Fails if it already exists. */
  create(params: {
    executionId: string;
    toolCallId: string;
    clientId?: string;
    spaceId: string;
    toolId: string;
    expiresAt: string;
  }): Promise<void>;

  /** Real-time GET of a call document. Returns undefined if not found. */
  get(executionId: string, toolCallId: string): Promise<BrowserToolCallRecord | undefined>;

  /** Atomically flip a pending, unexpired call to answered and store the result. */
  answer(params: {
    executionId: string;
    toolCallId: string;
    clientId?: string;
    result: BrowserToolResultPayload;
    now?: Date;
  }): Promise<BrowserToolCallAnswerOutcome>;

  /**
   * Mark a call as consumed or expired. Resolves to `skipped` when the transition did not
   * apply (e.g. expiring a call that was answered in the meantime).
   */
  setStatus(
    executionId: string,
    toolCallId: string,
    status: BrowserToolCallStatus.consumed | BrowserToolCallStatus.expired
  ): Promise<BrowserToolCallSetStatusOutcome>;
}

/**
 * Run-scoped view of the browser tools services, available to the agent loop.
 */
export interface BrowserToolsRunContext {
  registry: {
    has(id: string): boolean;
    get(id: string): BrowserToolDescriptor | undefined;
    list(): BrowserToolDescriptor[];
  };
  callClient: BrowserToolCallClientContract;
  uploadImage: (params: {
    image: BrowserToolImagePayload;
    request: KibanaRequest;
    attachments: AttachmentStateManager;
    toolId: string;
  }) => Promise<ImageResult>;
}

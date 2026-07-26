/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import type { ChatRequestBodyPayload } from '../../../../common/http_api/chat';
import { API_AGENT_BUILDER, COMMON_HEADERS } from './constants';

export type ExecutionMode = 'local' | 'task_manager';

export interface ScoutAgentBuilderApiClient {
  post(
    url: string,
    options?: {
      headers?: Record<string, string>;
      body?: unknown;
      responseType?: 'json';
    }
  ): Promise<{ statusCode: number; body: unknown }>;
  get(
    url: string,
    options?: {
      headers?: Record<string, string>;
      responseType?: 'json';
    }
  ): Promise<{ statusCode: number; body: unknown }>;
  delete(
    url: string,
    options?: {
      headers?: Record<string, string>;
      responseType?: 'json';
    }
  ): Promise<{ statusCode: number; body: unknown }>;
  put(
    url: string,
    options?: {
      headers?: Record<string, string>;
      body?: unknown;
      responseType?: 'json';
    }
  ): Promise<{ statusCode: number; body: unknown }>;
}

export async function postConverse(
  apiClient: ScoutAgentBuilderApiClient,
  authHeaders: Record<string, string>,
  payload: ChatRequestBodyPayload,
  executionMode: ExecutionMode
) {
  return apiClient.post(`${API_AGENT_BUILDER}/converse`, {
    headers: { ...COMMON_HEADERS, ...authHeaders },
    body: { ...payload, _execution_mode: executionMode },
    responseType: 'json',
  });
}

export async function getConversation(
  apiClient: ScoutAgentBuilderApiClient,
  authHeaders: Record<string, string>,
  conversationId: string
): Promise<Conversation> {
  const res = await apiClient.get(
    `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
    { headers: { ...COMMON_HEADERS, ...authHeaders }, responseType: 'json' }
  );
  if (res.statusCode !== 200) {
    throw new Error(`getConversation failed: ${res.statusCode} ${JSON.stringify(res.body)}`);
  }
  return res.body as Conversation;
}

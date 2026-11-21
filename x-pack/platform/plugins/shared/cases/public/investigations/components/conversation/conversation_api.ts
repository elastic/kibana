/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

const AGENT_BUILDER_API_VERSION = '2023-10-31';
const CONVERSATIONS_URL = '/api/agent_builder/conversations';
const CHAT_CONVERSE_URL = '/api/chat/converse';

/** The parts of an Agent Builder user reference the Investigations app reads. */
export interface ConversationUserRef {
  id?: string;
  username?: string;
  type?: string;
}

export interface ConversationRound {
  id: string;
  input: { message?: string };
  started_at: string;
  time_to_last_token?: number;
  author?: ConversationUserRef;
  response: { message?: string };
}

export interface ConversationEvent {
  id: string;
  type: string;
  created_at: string;
  actor?: ConversationUserRef;
  data?: { message?: string; steer?: unknown };
}

/** The subset of an Agent Builder conversation (`GET /api/agent_builder/conversations/{id}`) that is read here. */
export interface AgentConversation {
  id: string;
  title: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  rounds: ConversationRound[];
  events?: ConversationEvent[];
}

export const getAgentConversation = (http: HttpStart, conversationId: string) =>
  http.fetch<AgentConversation>(`${CONVERSATIONS_URL}/${encodeURIComponent(conversationId)}`, {
    method: 'GET',
    version: AGENT_BUILDER_API_VERSION,
  });

export interface ConverseRequest {
  agentId: string;
  conversationId: string;
  input: string;
  /** `never` stores the message without running the agent. */
  triggerMode: 'always' | 'never';
}

/** Sends a message through the chat API, which (unlike the converse API) supports `trigger_mode`. */
export const converse = (http: HttpStart, request: ConverseRequest) =>
  http.fetch<AgentConversation>(CHAT_CONVERSE_URL, {
    method: 'POST',
    version: AGENT_BUILDER_API_VERSION,
    body: JSON.stringify({
      agent_id: request.agentId,
      conversation_id: request.conversationId,
      input: request.input,
      trigger_mode: request.triggerMode,
    }),
  });

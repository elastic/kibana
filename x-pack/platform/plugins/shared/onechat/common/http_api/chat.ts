/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStep, AssistantResponse, AgentMode } from '@kbn/onechat-common';

/**
 * body payload for request to the /internal/onechat/chat endpoint
 */
export interface ChatRequestBodyPayload {
  agent_id?: string;
  mode?: AgentMode;
  connector_id?: string;
  conversation_id?: string;
  input: string;
}

export interface ChatResponse {
  conversation_id: string;
  trace_id?: string;
  steps: ConversationRoundStep[];
  response: AssistantResponse;
}

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
  agentId?: string;
  mode?: AgentMode;
  connectorId?: string;
  conversationId?: string;
  nextMessage: string;
}

export interface ChatResponse {
  conversationId: string;
  steps: ConversationRoundStep[];
  response: AssistantResponse;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * body payload for request to the /internal/onechat/chat endpoint
 */
export interface ChatRequestBodyPayload {
  agentId?: string;
  connectorId?: string;
  conversationId?: string;
  nextMessage: string;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, AgentCapabilities } from '@kbn/onechat-common';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { BrowserApiToolMetadata } from '@kbn/onechat-common';

/**
 * body payload for request to the /internal/onechat/chat endpoint
 */
export interface ChatRequestBodyPayload {
  agent_id?: string;
  connector_id?: string;
  conversation_id?: string;
  capabilities?: AgentCapabilities;
  attachments?: AttachmentInput[];
  input: string;
  browser_api_tools?: BrowserApiToolMetadata[];
}

export type ChatResponse = Omit<ConversationRound, 'id' | 'input'> & {
  conversation_id: string;
};

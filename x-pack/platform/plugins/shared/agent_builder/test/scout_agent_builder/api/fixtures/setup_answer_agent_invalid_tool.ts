/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import {
  mockAgentToolCall,
  mockFinalAnswer,
  mockTitleGeneration,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario/calls';

/**
 * Agent calls an invalid tool on first call and then responds on the second call.
 */
export async function setupAnswerAgentCallsInvalidTool({
  response,
  proxy,
  title = 'New discussion',
  continueConversation = false,
}: {
  response: string;
  title?: string;
  proxy: LlmProxy;
  continueConversation?: boolean;
}): Promise<void> {
  if (!continueConversation) {
    mockTitleGeneration(proxy, title);
  }

  mockAgentToolCall({
    llmProxy: proxy,
    toolName: 'nonexistent_tool',
    toolArg: {
      query: 'just a query',
    },
  });

  mockFinalAnswer(proxy, response);
}

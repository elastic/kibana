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
  mockHandoverToAnswer,
  mockTitleGeneration,
} from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/proxy_scenario/calls';

/**
 * Answer agent calls an invalid tool on first call and then responds on the second call.
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

  mockHandoverToAnswer(proxy, 'ready to answer');

  mockAgentToolCall({
    llmProxy: proxy,
    toolName: 'platform_core_search',
    toolArg: {
      query: 'just a query',
    },
  });

  mockFinalAnswer(proxy, response);
}

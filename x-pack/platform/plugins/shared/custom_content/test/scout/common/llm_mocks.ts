/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { createToolCallMessage } from '@kbn/ftr-llm-proxy';

const TITLE_GENERATION_PROMPT = 'You are a title-generation utility';

/** Whether the model request is the conversation title generation, not the agent's own turn. */
export const isTitleGenerationRequest = (messages: Array<{ role: string; content?: unknown }>) =>
  String(messages.find((m) => m.role === 'system')?.content ?? '').includes(
    TITLE_GENERATION_PROMPT
  );

export const mockTitleGeneration = (proxy: LlmProxy, title: string) => {
  void proxy
    .intercept({
      name: 'set_title',
      when: ({ messages }) => isTitleGenerationRequest(messages),
      responseMock: createToolCallMessage('set_title', { title }),
    })
    .completeAfterIntercept();
};

export const mockToolCall = (
  proxy: LlmProxy,
  toolName: string,
  toolArg: Record<string, unknown>
) => {
  void proxy.interceptors.userMessage({
    name: 'agent:tool_call',
    when: ({ messages }) => !isTitleGenerationRequest(messages),
    response: createToolCallMessage(toolName, toolArg),
  });
};

export const mockFinalAnswer = (proxy: LlmProxy, answer: string) => {
  void proxy
    .intercept({ name: 'final-assistant-response', when: () => true, responseMock: answer })
    .completeAfterIntercept();
};

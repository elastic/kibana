/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { createToolCallMessage } from '@kbn/ftr-llm-proxy';

const TITLE_GENERATION_PROMPT = 'You are a title-generation utility';
const TEMPLATE_GENERATION_PROMPT = 'Generate a reusable HTML template using Liquid template syntax';

const isTemplateGenerationRequest = (messages: Array<{ role: string; content?: unknown }>) =>
  String(messages.find((m) => m.role === 'system')?.content ?? '').includes(
    TEMPLATE_GENERATION_PROMPT
  );

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

/** Scripts the template the server writes for a panel whose query is new or has changed. */
export const mockTemplateGeneration = (proxy: LlmProxy, template: string) => {
  void proxy
    .intercept({
      name: 'custom_content:template',
      when: ({ messages }) => isTemplateGenerationRequest(messages),
      responseMock: template,
    })
    .completeAfterIntercept();
};

const EXECUTE_DYNAMIC_TOOL = 'execute_dynamic_tool';

/**
 * A call to a dynamic tool, which the model reaches through `execute_dynamic_tool`. The tools an
 * attachment type exposes (`getTools`) are dynamic: their definitions arrive in the conversation
 * rather than in the tool list, and `tool_id` is the tool's id as the definition gives it.
 */
export const createDynamicToolCallMessage = (toolId: string, params: Record<string, unknown>) =>
  createToolCallMessage(EXECUTE_DYNAMIC_TOOL, { tool_id: toolId, params });

/** Answers the user's message with a dynamic tool call. */
export const mockDynamicToolCall = (
  proxy: LlmProxy,
  toolId: string,
  params: Record<string, unknown>
) => {
  void proxy.interceptors.userMessage({
    name: `agent:${EXECUTE_DYNAMIC_TOOL}:${toolId}`,
    when: ({ messages }) => !isTitleGenerationRequest(messages),
    response: createDynamicToolCallMessage(toolId, params),
  });
};

export const mockFinalAnswer = (proxy: LlmProxy, answer: string) => {
  void proxy
    .intercept({ name: 'final-assistant-response', when: () => true, responseMock: answer })
    .completeAfterIntercept();
};

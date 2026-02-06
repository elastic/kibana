/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL } from '@kbn/connector-schemas/openai';

const APIS_ALLOWING_STREAMING = new Set<string>([OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL]);

function stripToolCallingParamsIfNoTools(jsonBody: Record<string, unknown>) {
  // Some OpenAI-compatible providers (e.g. Anthropic via LiteLLM behind an OpenAI provider config)
  // reject tool-calling parameters unless `tools` is explicitly provided. If we don't have any
  // tools, omit tool-calling params to keep the request compatible.
  const tools = (jsonBody as { tools?: unknown }).tools;
  const toolCount = Array.isArray(tools) ? tools.length : 0;
  if (toolCount === 0) {
    delete (jsonBody as { tool_choice?: unknown }).tool_choice;
    delete (jsonBody as { parallel_tool_calls?: unknown }).parallel_tool_calls;
  }

  // Legacy function-calling parameters (pre-`tools`). If there are no functions, omit function_call.
  const functions = (jsonBody as { functions?: unknown }).functions;
  const functionCount = Array.isArray(functions) ? functions.length : 0;
  if (functionCount === 0) {
    delete (jsonBody as { function_call?: unknown }).function_call;
  }
}

/**
 * Sanitizes the Open AI request body to set stream to false
 * so users cannot specify a streaming response when the framework
 * is not prepared to handle streaming
 *
 * The stream parameter is accepted in the ChatCompletion
 * API and the Completion API only
 */
export const sanitizeRequest = (url: string, body: string, defaultModel: string): string => {
  return getRequestWithStreamOption(url, body, false, defaultModel);
};

/**
 * Intercepts the Open AI request body to set the stream parameter
 *
 * The stream parameter is accepted in the ChatCompletion
 * API and the Completion API only
 */
export const getRequestWithStreamOption = (
  url: string,
  body: string,
  stream: boolean,
  defaultModel: string
): string => {
  try {
    const jsonBody = JSON.parse(body);
    if (jsonBody) {
      if (APIS_ALLOWING_STREAMING.has(url)) {
        jsonBody.stream = stream;
        if (stream) {
          jsonBody.stream_options = {
            include_usage: true,
          };
        }
      }
      jsonBody.model = jsonBody.model || defaultModel;
      if (typeof jsonBody === 'object') {
        stripToolCallingParamsIfNoTools(jsonBody as Record<string, unknown>);
      }
    }

    return JSON.stringify(jsonBody);
  } catch (err) {
    // swallow the error
  }

  return body;
};

// removes the chat completions endpoint from the OpenAI url in order
// to provide the correct endpoint for the OpenAI node package
export const removeEndpointFromUrl = (url: string): string => {
  const endpointToRemove = /\/chat\/completions\/?$/;
  return url.replace(endpointToRemove, '');
};

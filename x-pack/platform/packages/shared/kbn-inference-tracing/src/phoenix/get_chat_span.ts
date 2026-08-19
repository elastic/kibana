/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INPUT_MIME_TYPE,
  INPUT_VALUE,
  LLM_INPUT_MESSAGES,
  LLM_INVOCATION_PARAMETERS,
  LLM_MODEL_NAME,
  LLM_OUTPUT_MESSAGES,
  LLM_PROVIDER,
  LLM_SYSTEM,
  LLM_TOKEN_COUNT_COMPLETION,
  LLM_TOKEN_COUNT_PROMPT,
  LLM_TOKEN_COUNT_TOTAL,
  LLM_TOKEN_COUNT_PROMPT_DETAILS_CACHE_READ,
  MESSAGE_CONTENT,
  MESSAGE_ROLE,
  MESSAGE_TOOL_CALLS,
  MESSAGE_TOOL_CALL_ID,
  MimeType,
  OUTPUT_VALUE,
  SemanticConventions,
  TOOL_CALL_FUNCTION_ARGUMENTS_JSON,
  TOOL_CALL_FUNCTION_NAME,
  TOOL_CALL_ID,
  PROMPT_ID,
  PROMPT_TEMPLATE_VARIABLES,
  PROMPT_TEMPLATE_TEMPLATE,
  LLM_TOOLS,
} from '@arizeai/openinference-semantic-conventions';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { ToolDefinition } from '@kbn/inference-common';
import type { GenAIInputMessage, GenAIOutputMessage, GenAITextPart } from '../types';
import { GenAISemanticConventions } from '../types';
import { flattenAttributes } from '../util/flatten_attributes';
import { parseJsonAttr } from '../util/parse_json_attr';
import { isTextPart, isToolCallPart, isToolCallResponsePart } from '../util/message_parts';

export function getChatSpan(span: tracing.ReadableSpan) {
  const inputMessages = parseJsonAttr<GenAIInputMessage[]>(
    span.attributes[GenAISemanticConventions.GenAIInputMessages]
  );
  const outputMessages = parseJsonAttr<GenAIOutputMessage[]>(
    span.attributes[GenAISemanticConventions.GenAIOutputMessages]
  );
  const systemInstructions = parseJsonAttr<GenAITextPart[]>(
    span.attributes[GenAISemanticConventions.GenAISystemInstructions]
  );

  span.attributes[LLM_MODEL_NAME] = span.attributes[GenAISemanticConventions.GenAIResponseModel];

  span.attributes[INPUT_MIME_TYPE] = MimeType.JSON;
  span.attributes[LLM_INVOCATION_PARAMETERS] = JSON.stringify({
    system: systemInstructions?.[0]?.content,
  });
  span.attributes[LLM_SYSTEM] = span.attributes[GenAISemanticConventions.GenAIProviderName];

  span.attributes[LLM_PROVIDER] = span.attributes[GenAISemanticConventions.GenAIProviderName];

  span.attributes[LLM_TOKEN_COUNT_COMPLETION] =
    span.attributes[GenAISemanticConventions.GenAIUsageOutputTokens];

  span.attributes[LLM_TOKEN_COUNT_PROMPT] =
    span.attributes[GenAISemanticConventions.GenAIUsageInputTokens];

  span.attributes[LLM_TOKEN_COUNT_PROMPT_DETAILS_CACHE_READ] =
    span.attributes[GenAISemanticConventions.GenAIUsageCacheReadInputTokens];

  span.attributes[LLM_TOKEN_COUNT_TOTAL] =
    Number(span.attributes[LLM_TOKEN_COUNT_COMPLETION] ?? 0) +
    Number(span.attributes[LLM_TOKEN_COUNT_PROMPT] ?? 0);

  span.attributes[PROMPT_ID] = span.attributes['gen_ai.prompt.id'];
  span.attributes[PROMPT_TEMPLATE_TEMPLATE] = span.attributes['gen_ai.prompt.template.template'];

  span.attributes[PROMPT_TEMPLATE_VARIABLES] = span.attributes['gen_ai.prompt.template.variables']
    ? JSON.stringify(span.attributes['gen_ai.prompt.template.variables'])
    : undefined;

  const allInputForDisplay: Array<Record<string, string>> = [];

  if (systemInstructions) {
    allInputForDisplay.push({
      role: 'system',
      content: systemInstructions.map((p) => p.content).join('\n'),
    });
  }

  if (inputMessages) {
    for (const msg of inputMessages) {
      const textContent = msg.parts
        .filter(isTextPart)
        .map((p) => p.content)
        .join('\n');

      allInputForDisplay.push({
        role: msg.role,
        content: textContent || JSON.stringify(msg.parts),
      });
    }
  }

  span.attributes[INPUT_VALUE] = JSON.stringify(allInputForDisplay);

  const parsedTools: Record<string, ToolDefinition> = span.attributes[
    GenAISemanticConventions.GenAIToolDefinitions
  ]
    ? parseJsonAttr<Record<string, ToolDefinition>>(
        span.attributes[GenAISemanticConventions.GenAIToolDefinitions]
      ) ?? {}
    : {};

  span.attributes[LLM_TOOLS] = JSON.stringify(
    Object.entries(parsedTools).map(([name, definition]) => {
      return {
        'tool.name': name,
        'tool.description': definition.description,
        'tool.json_schema': definition.schema,
      };
    })
  );

  if (outputMessages?.length) {
    const firstOutput = outputMessages[0];
    const textContent = firstOutput.parts
      .filter(isTextPart)
      .map((p) => p.content)
      .join('');
    const toolCalls = firstOutput.parts.filter(isToolCallPart);

    span.attributes[OUTPUT_VALUE] = JSON.stringify({
      content: textContent || null,
      role: 'assistant',
      ...(toolCalls.length
        ? {
            tool_calls: toolCalls.map((tc) => ({
              function: { name: tc.name, arguments: tc.arguments },
              id: tc.id,
              type: 'function',
            })),
          }
        : {}),
    });

    Object.assign(
      span.attributes,
      flattenAttributes({
        [`${LLM_OUTPUT_MESSAGES}.0`]: {
          [MESSAGE_ROLE]: 'assistant',
          [MESSAGE_CONTENT]: textContent || null,
          [MESSAGE_TOOL_CALLS]: toolCalls.map((tc) => ({
            [TOOL_CALL_ID]: tc.id,
            [TOOL_CALL_FUNCTION_NAME]: tc.name,
            [TOOL_CALL_FUNCTION_ARGUMENTS_JSON]: tc.arguments,
          })),
        },
      })
    );
  }

  if (inputMessages) {
    const llmInputMessages: Array<Record<string, unknown>> = [];

    if (systemInstructions) {
      llmInputMessages.push({
        [SemanticConventions.MESSAGE_ROLE]: 'system',
        [SemanticConventions.MESSAGE_CONTENT]: systemInstructions.map((p) => p.content).join('\n'),
        [MESSAGE_TOOL_CALLS]: [],
      });
    }

    for (const msg of inputMessages) {
      const entry: Record<string, unknown> = {
        [SemanticConventions.MESSAGE_ROLE]: msg.role,
        [SemanticConventions.MESSAGE_CONTENT]:
          msg.parts
            .filter(isTextPart)
            .map((p) => p.content)
            .join('\n') || '',
      };

      if (msg.role === 'assistant') {
        const toolCallParts = msg.parts.filter(isToolCallPart);
        entry[MESSAGE_TOOL_CALLS] = toolCallParts.map((tc) => ({
          [SemanticConventions.TOOL_CALL_ID]: tc.id,
          [SemanticConventions.TOOL_CALL_FUNCTION_NAME]: tc.name,
          [SemanticConventions.TOOL_CALL_FUNCTION_ARGUMENTS_JSON]: tc.arguments,
        }));
      } else {
        entry[MESSAGE_TOOL_CALLS] = [];
      }

      if (msg.role === 'tool') {
        const responsePart = msg.parts.find(isToolCallResponsePart);
        if (responsePart) {
          entry[MESSAGE_TOOL_CALL_ID] = responsePart.id;
          entry[SemanticConventions.MESSAGE_CONTENT] = responsePart.response;
        }
      }

      llmInputMessages.push(entry);
    }

    const flattenedInputMessages = flattenAttributes(
      Object.fromEntries(
        llmInputMessages.map((message, index) => {
          return [`${LLM_INPUT_MESSAGES}.${index}`, message];
        })
      )
    );

    Object.assign(span.attributes, flattenedInputMessages);
  }

  return span;
}

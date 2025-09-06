/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { ConversationRound, RoundInput, ToolCallWithResult } from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';

/**
 * Converts a conversation to langchain format
 */
export const conversationToLangchainMessages = ({
  previousRounds,
  nextInput,
  ignoreSteps = false,
  toolParameters,
}: {
  previousRounds: ConversationRound[];
  nextInput: RoundInput;
  ignoreSteps?: boolean;
  toolParameters?: Record<string, any>;
}): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  for (const round of previousRounds) {
    messages.push(...roundToLangchain(round, { ignoreSteps, toolParameters }));
  }

  messages.push(createUserMessage({ content: nextInput.message }));

  return messages;
};

export const roundToLangchain = (
  round: ConversationRound,
  {
    ignoreSteps = false,
    toolParameters,
  }: { ignoreSteps?: boolean; toolParameters?: Record<string, any> } = {}
): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  // user message
  messages.push(
    createUserMessage({
      content: round.input.message,
    })
  );

  // steps
  if (!ignoreSteps) {
    for (const step of round.steps) {
      if (isToolCallStep(step)) {
        messages.push(...createToolCallMessages(step, toolParameters));
      }
    }
  }

  // assistant response
  messages.push(createAssistantMessage({ content: round.response.message }));

  return messages;
};

const createUserMessage = ({ content }: { content: string }): HumanMessage => {
  return new HumanMessage({
    content,
  });
};

const createAssistantMessage = ({ content }: { content: string }): AIMessage => {
  return new AIMessage({ content });
};

export const createToolCallMessages = (
  toolCall: ToolCallWithResult,
  toolParameters?: Record<string, any>
): [AIMessage, ToolMessage] => {
  const toolName = sanitizeToolId(toolCall.tool_id);

  console.log('toolParameters', toolParameters);
  console.log('toolCall.tool_id', toolCall.tool_id);
  // Merge tool parameters with the tool call params if toolParameters are provided
  let args = toolCall.params;
  if (toolParameters && Object.keys(toolParameters).length > 0) {
    args = {
      ...toolCall.params,
      ...toolParameters,
    };
  }

  const toolCallMessage = new AIMessage({
    content: '',
    tool_calls: [
      {
        id: toolCall.tool_call_id,
        name: toolName,
        args,
        type: 'tool_call',
      },
    ],
  });

  const toolResultMessage = new ToolMessage({
    tool_call_id: toolCall.tool_call_id,
    content: JSON.stringify({ results: toolCall.results }),
  });

  return [toolCallMessage, toolResultMessage];
};

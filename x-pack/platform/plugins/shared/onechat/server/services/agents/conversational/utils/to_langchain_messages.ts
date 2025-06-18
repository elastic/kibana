/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRound,
  RoundInput,
  ToolCallWithResult,
  isToolCallStep,
} from '@kbn/onechat-common';
import { BaseMessage, AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { toolIdToLangchain } from './tool_provider_to_langchain_tools';

/**
 * Converts a conversation to langchain format
 */
export const conversationLangchainMessages = ({
  previousRounds,
  nextInput,
}: {
  previousRounds: ConversationRound[];
  nextInput: RoundInput;
}): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  for (const round of previousRounds) {
    messages.push(...roundToLangchain(round));
  }

  messages.push(createUserMessage({ content: nextInput.message }));

  return messages;
};

export const roundToLangchain = (round: ConversationRound): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  // user message
  messages.push(createUserMessage({ content: round.userInput.message }));

  // tool calls
  for (const step of round.steps) {
    if (isToolCallStep(step)) {
      messages.push(...createToolCallMessages(step));
    }
  }

  // assistant response
  messages.push(createAssistantMessage({ content: round.assistantResponse.message }));

  return messages;
};

const createUserMessage = ({ content }: { content: string }): HumanMessage => {
  return new HumanMessage({ content });
};

const createAssistantMessage = ({ content }: { content: string }): AIMessage => {
  return new AIMessage({ content });
};

export const createToolCallMessages = (toolCall: ToolCallWithResult): [AIMessage, ToolMessage] => {
  const toolCallMessage = new AIMessage({
    content: '',
    tool_calls: [
      {
        id: toolCall.toolCallId,
        name: toolIdToLangchain(toolCall.toolId),
        args: toolCall.args,
        type: 'tool_call',
      },
    ],
  });

  const toolResultMessage = new ToolMessage({
    tool_call_id: toolCall.toolCallId,
    content: toolCall.result,
  });

  return [toolCallMessage, toolResultMessage];
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { AssistantResponse, ToolCallWithResult } from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';
import {
  sanitizeToolId,
  createUserMessage,
  createAIMessage,
} from '@kbn/onechat-genai-utils/langchain';
import { generateXmlTree } from '@kbn/onechat-genai-utils/tools/utils';
import type {
  ProcessedConversation,
  ProcessedRoundInput,
  ProcessedConversationRound,
  ProcessedAttachment,
} from './prepare_conversation';

/**
 * Converts a conversation to langchain format
 */
export const conversationToLangchainMessages = ({
  conversation,
  ignoreSteps = false,
}: {
  conversation: ProcessedConversation;
  ignoreSteps?: boolean;
}): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  for (const round of conversation.previousRounds) {
    messages.push(...roundToLangchain(round, { ignoreSteps }));
  }

  messages.push(formatRoundInput({ input: conversation.nextInput }));

  return messages;
};

export const roundToLangchain = (
  round: ProcessedConversationRound,
  { ignoreSteps = false }: { ignoreSteps?: boolean } = {}
): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  // user message
  messages.push(formatRoundInput({ input: round.input }));

  // steps
  if (!ignoreSteps) {
    for (const step of round.steps) {
      if (isToolCallStep(step)) {
        messages.push(...createToolCallMessages(step));
      }
    }
  }

  // assistant response
  messages.push(formatAssistantResponse({ response: round.response }));

  return messages;
};

const formatRoundInput = ({ input }: { input: ProcessedRoundInput }): HumanMessage => {
  const { message, attachments } = input;

  let content = message;

  if (attachments.length > 0) {
    content += `\n\n
<attachments>
${attachments.map((attachment) => formatAttachment({ attachment, indent: 2 })).join('\n')}
</attachments>
`;
  }

  return createUserMessage(content);
};

const formatAttachment = ({
  attachment,
  indent = 0,
}: {
  attachment: ProcessedAttachment;
  indent?: number;
}): string => {
  return generateXmlTree(
    {
      tagName: 'attachment',
      attributes: {
        type: attachment.attachment.type,
        id: attachment.attachment.id,
      },
      children: [attachment.representation.value],
    },
    { initialIndentLevel: indent, escapeContent: false }
  );
};

const formatAssistantResponse = ({ response }: { response: AssistantResponse }): AIMessage => {
  return createAIMessage(response.message);
};

export const createToolCallMessages = (toolCall: ToolCallWithResult): [AIMessage, ToolMessage] => {
  const toolName = sanitizeToolId(toolCall.tool_id);

  const toolCallMessage = new AIMessage({
    content: '',
    tool_calls: [
      {
        id: toolCall.tool_call_id,
        name: toolName,
        args: toolCall.params,
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

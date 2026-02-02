/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { AssistantResponse, ToolCallWithResult, ToolResult } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, isToolCallStep, ToolResultType } from '@kbn/agent-builder-common';
import {
  createAIMessage,
  createUserMessage,
  sanitizeToolId,
} from '@kbn/agent-builder-genai-utils/langchain';
import { generateXmlTree, type XmlNode } from '@kbn/agent-builder-genai-utils/tools/utils';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type {
  ProcessedAttachment,
  ProcessedConversation,
  ProcessedConversationRound,
  ProcessedRoundInput,
} from './prepare_conversation';
import { getToolCallEntryPath } from '../../../runner/store/volumes/tool_results/utils';

/**
 * Token threshold for file reference substitution.
 * Tool results exceeding this threshold will be replaced with a file reference.
 */
export const FILE_REFERENCE_TOKEN_THRESHOLD = 500;

/**
 * Context provided to the result transformer for each tool result.
 */
export interface ResultTransformerContext {
  toolId: string;
  toolCallId: string;
}

/**
 * Function type for transforming tool results.
 * Can be used to substitute large results with file references or perform other transformations.
 */
export type ResultTransformer = (
  result: ToolResult,
  context: ResultTransformerContext
) => Promise<ToolResult>;

export interface ConversationToLangchainOptions {
  conversation: ProcessedConversation;
  /**
   * Optional function to transform tool results.
   * When provided, each tool result will be passed through this function.
   * Defaults to identity (no transformation).
   */
  resultTransformer?: ResultTransformer;
  /**
   * When true, tool call steps will be ignored.
   */
  ignoreSteps?: boolean;
}

/**
 * Creates a result transformer that substitutes large tool results with file references.
 *
 * @param filestore - The filestore to read token counts from
 * @param threshold - Token count threshold above which results are substituted (defaults to FILE_REFERENCE_TOKEN_THRESHOLD)
 */
export const createFilestoreResultTransformer = (
  filestore: IFileStore,
  threshold: number = FILE_REFERENCE_TOKEN_THRESHOLD
): ResultTransformer => {
  return async (result, { toolId, toolCallId }) => {
    const path = getToolCallEntryPath({
      toolId,
      toolCallId,
      toolResultId: result.tool_result_id,
    });

    const entry = await filestore.read(path);

    // If entry exists and exceeds threshold, substitute with file reference
    if (entry && entry.metadata.token_count > threshold) {
      return {
        tool_result_id: result.tool_result_id,
        type: ToolResultType.fileReference,
        data: {
          filepath: path,
          comment:
            'The result has been stored on the filestore. You can access it using the filestore_read tool with the specified filepath',
        },
      };
    }

    // Keep original result
    return result;
  };
};

/**
 * Converts a conversation to langchain format.
 *
 * When `resultTransformer` is provided, tool results from previous rounds
 * will be passed through the transformer function.
 */
export const conversationToLangchainMessages = async ({
  conversation,
  resultTransformer,
  ignoreSteps = false,
}: ConversationToLangchainOptions): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];

  let rounds = conversation.previousRounds;
  let input = conversation.nextInput;

  // need to ignore the last round if it's awaiting a prompt, the graph handles resuming the actions
  // we also uses the last message's input as the "next" input (given the actual input will be the prompt response)
  const lastRound = conversation.previousRounds[conversation.previousRounds.length - 1];
  if (lastRound && lastRound.status === ConversationRoundStatus.awaitingPrompt) {
    rounds = rounds.slice(0, rounds.length - 1);
    input = lastRound.input;
  }

  for (const round of rounds) {
    messages.push(...(await roundToLangchain(round, { resultTransformer, ignoreSteps })));
  }

  messages.push(formatRoundInput({ input }));

  return messages;
};

export const roundToLangchain = async (
  round: ProcessedConversationRound,
  {
    resultTransformer,
    ignoreSteps = false,
  }: { resultTransformer?: ResultTransformer; ignoreSteps?: boolean } = {}
): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];

  // user message
  messages.push(formatRoundInput({ input: round.input }));

  // steps
  if (!ignoreSteps) {
    for (const step of round.steps) {
      if (isToolCallStep(step)) {
        messages.push(...(await createToolCallMessages(step, { resultTransformer })));
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
    const attachmentsXml = generateXmlTree(
      {
        tagName: 'attachments',
        children: attachments.map((attachment) => formatAttachment({ attachment })),
      },
      { escapeContent: false }
    );

    content += `\n\n${attachmentsXml}\n`;
  }

  return createUserMessage(content);
};

const formatAttachment = ({ attachment }: { attachment: ProcessedAttachment }): XmlNode => {
  return {
    tagName: 'attachment',
    attributes: {
      type: attachment.attachment.type,
      id: attachment.attachment.id,
    },
    children: [attachment.representation.value],
  };
};

const formatAssistantResponse = ({ response }: { response: AssistantResponse }): AIMessage => {
  return createAIMessage(response.message);
};

/**
 * Creates tool call messages.
 * When `resultTransformer` is provided, results will be passed through it.
 */
export const createToolCallMessages = async (
  toolCall: ToolCallWithResult,
  { resultTransformer }: { resultTransformer?: ResultTransformer } = {}
): Promise<[AIMessage, ToolMessage]> => {
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

  // Process results - apply transformer if provided
  const processedResults = resultTransformer
    ? await Promise.all(
        toolCall.results.map((result) =>
          resultTransformer(result, {
            toolId: toolCall.tool_id,
            toolCallId: toolCall.tool_call_id,
          })
        )
      )
    : toolCall.results;

  const toolResultMessage = new ToolMessage({
    tool_call_id: toolCall.tool_call_id,
    content: JSON.stringify({ results: processedResults }),
  });

  return [toolCallMessage, toolResultMessage];
};

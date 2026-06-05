/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type {
  AssistantResponse,
  ConversationRoundStep,
  ReasoningStep,
  ToolCallStep,
  ToolCallWithResult,
  AgentExecutionEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  isReasoningStep,
  isToolCallStep,
  isBackgroundAgentCompleteStep,
} from '@kbn/agent-builder-common';
import {
  createAIMessage,
  createUserMessage,
  sanitizeToolId,
  wrapToolResultContent,
} from '@kbn/agent-builder-genai-utils/langchain';
import { generateXmlTree, type XmlNode } from '@kbn/agent-builder-genai-utils/tools/utils';
import type { ProcessedAttachment, ProcessedRoundInput } from '@kbn/agent-builder-server';
import type { CompactionSummary } from '@kbn/agent-builder-common';
import { formatSystemNotice } from '../prompts/utils/actions';
import type {
  ProcessedConversation,
  ProcessedTimelineEvent,
  ProcessedUserMessageEvent,
} from './prepare_conversation';
import {
  isProcessedUserMessageEvent,
  isProcessedAgentExecutionEvent,
} from './prepare_conversation';
import type { ToolCallResultTransformer } from './create_result_transformer';
import { serializeCompactionSummary } from './conversation_compactor';

export interface ConversationToLangchainOptions {
  conversation: ProcessedConversation;
  /**
   * Optional function to transform all results from a tool call.
   * When provided, results will be passed through this function.
   * Defaults to identity (no transformation).
   */
  resultTransformer?: ToolCallResultTransformer;
  /**
   * When true, tool call steps will be ignored.
   */
  ignoreSteps?: boolean;
  /**
   * Optional compaction summary to inject before the remaining events.
   * When provided, the summary is serialized and prepended as a
   * user/assistant message pair representing the compacted history.
   */
  compactionSummary?: CompactionSummary;
}

/**
 * Converts processed conversation events to langchain message format.
 *
 * When `resultTransformer` is provided, tool results from previous events
 * will be passed through the transformer function.
 */
export const convertPreviousEvents = async ({
  conversation,
  resultTransformer,
  ignoreSteps = false,
  compactionSummary,
}: ConversationToLangchainOptions): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];

  let events = conversation.previousEvents;
  let input = conversation.nextInput;

  // Need to ignore the last agent response if it's awaiting a prompt.
  // The graph handles resuming the actions.
  // We use the preceding user message's input as the "next" input
  // (given the actual input will be the prompt response).
  const lastAgentResponse = findLastAgentResponse(events);
  if (lastAgentResponse?.status === ConversationRoundStatus.awaitingPrompt) {
    // Find the preceding user message
    const lastAgentIdx = events.lastIndexOf(lastAgentResponse);
    const precedingUserMsg = findPrecedingUserMessage(events, lastAgentIdx);
    if (precedingUserMsg) {
      input = precedingUserMsg.processedInput;
    }
    // Strip the last agent response from events
    events = events.slice(0, lastAgentIdx);
  }

  // Inject compaction summary as a user/assistant exchange before remaining events
  if (compactionSummary) {
    const summaryText = serializeCompactionSummary(compactionSummary.structured_data);
    messages.push(createUserMessage('[Previous conversation context was compacted]'));
    messages.push(createAIMessage(summaryText));
  }

  for (const event of events) {
    if (isProcessedUserMessageEvent(event)) {
      messages.push(formatProcessedInput({ input: event.processedInput }));
    } else if (isProcessedAgentExecutionEvent(event)) {
      messages.push(...(await agentResponseToLangchain(event, { resultTransformer, ignoreSteps })));
    }
  }

  messages.push(formatProcessedInput({ input }));

  return messages;
};

/**
 * Converts an AgentExecutionEvent to langchain messages (steps + response).
 */
export const agentResponseToLangchain = async (
  agentResponse: AgentExecutionEvent,
  {
    resultTransformer,
    ignoreSteps = false,
  }: { resultTransformer?: ToolCallResultTransformer; ignoreSteps?: boolean } = {}
): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];

  // steps
  if (!ignoreSteps) {
    const groups = groupToolCallSteps(agentResponse.steps);
    const reasoningSteps = agentResponse.steps.filter(isReasoningStep);

    let groupIndex = 0;
    for (const step of agentResponse.steps) {
      if (isBackgroundAgentCompleteStep(step)) {
        messages.push(createUserMessage(formatSystemNotice(step)));
      } else if (isToolCallStep(step)) {
        // Only process when we hit the first tool call of a group
        const group = groups[groupIndex];
        if (group && group[0] === step) {
          messages.push(
            ...(await createGroupedToolCallMessages(group, { resultTransformer, reasoningSteps }))
          );
          groupIndex++;
        }
        // Other tool calls in the same group are handled by createGroupedToolCallMessages
      }
      // Reasoning steps are handled inside createGroupedToolCallMessages via reasoningSteps param
    }
  }

  // assistant response
  messages.push(formatAssistantResponse({ response: agentResponse.response }));

  return messages;
};

const formatProcessedInput = ({ input }: { input: ProcessedRoundInput }): HumanMessage => {
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
 * Groups consecutive tool call steps by `tool_call_group_id`.
 * Steps sharing the same group ID are grouped together (parallel calls).
 * Steps without a group ID are each in their own group (backward compat).
 */
export const groupToolCallSteps = (steps: ConversationRoundStep[]): ToolCallStep[][] => {
  const groups: ToolCallStep[][] = [];
  let currentGroup: ToolCallStep[] = [];
  let currentGroupId: string | undefined;

  for (const step of steps) {
    if (!isToolCallStep(step)) {
      // Only break the group if there's no active group_id.
      // Non-tool-call steps (e.g. reasoning) can appear between parallel
      // tool calls that share the same group_id and must not split them.
      if (currentGroup.length > 0 && !currentGroupId) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      continue;
    }

    const { tool_call_group_id: groupId } = step;

    if (groupId && groupId === currentGroupId) {
      currentGroup.push(step);
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [step];
      currentGroupId = groupId;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

/**
 * Creates langchain messages for a group of tool call steps.
 * For parallel groups (multiple steps), produces one AIMessage with all tool_calls
 * followed by one ToolMessage per tool call.
 */
const createGroupedToolCallMessages = async (
  toolCalls: ToolCallWithResult[],
  {
    resultTransformer,
    reasoningSteps = [],
  }: { resultTransformer?: ToolCallResultTransformer; reasoningSteps?: ReasoningStep[] } = {}
): Promise<BaseMessage[]> => {
  const groupId = toolCalls[0]?.tool_call_group_id;
  const groupReasoning = groupId
    ? reasoningSteps
        .filter((s) => s.tool_call_group_id === groupId && !s.tool_call_id)
        .map((s) => s.reasoning)
        .join('\n')
    : '';

  const aiMessage = new AIMessage({
    content: groupReasoning,
    tool_calls: toolCalls.map((toolCall) => {
      const stepReasoning = reasoningSteps
        .filter((s) => s.tool_call_id === toolCall.tool_call_id)
        .map((s) => s.reasoning)
        .join('\n');
      return {
        id: toolCall.tool_call_id,
        name: sanitizeToolId(toolCall.tool_id),
        args: stepReasoning ? { _reasoning: stepReasoning, ...toolCall.params } : toolCall.params,
        type: 'tool_call' as const,
      };
    }),
  });

  const toolMessages: ToolMessage[] = [];
  for (const toolCall of toolCalls) {
    const processedResults = resultTransformer
      ? await resultTransformer(toolCall)
      : toolCall.results;
    toolMessages.push(
      new ToolMessage({
        tool_call_id: toolCall.tool_call_id,
        content: wrapToolResultContent(JSON.stringify({ results: processedResults })),
      })
    );
  }

  return [aiMessage, ...toolMessages];
};

/**
 * Creates tool call messages for a single tool call.
 * When `resultTransformer` is provided, results will be passed through it.
 */
export const createToolCallMessages = async (
  toolCall: ToolCallWithResult,
  { resultTransformer }: { resultTransformer?: ToolCallResultTransformer } = {}
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
  const processedResults = resultTransformer ? await resultTransformer(toolCall) : toolCall.results;

  const toolResultMessage = new ToolMessage({
    tool_call_id: toolCall.tool_call_id,
    content: wrapToolResultContent(JSON.stringify({ results: processedResults })),
  });

  return [toolCallMessage, toolResultMessage];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const findLastAgentResponse = (
  events: ProcessedTimelineEvent[]
): AgentExecutionEvent | undefined => {
  for (let i = events.length - 1; i >= 0; i--) {
    if (isProcessedAgentExecutionEvent(events[i])) {
      return events[i] as AgentExecutionEvent;
    }
  }
  return undefined;
};

const findPrecedingUserMessage = (
  events: ProcessedTimelineEvent[],
  beforeIndex: number
): ProcessedUserMessageEvent | undefined => {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    if (isProcessedUserMessageEvent(events[i])) {
      return events[i] as ProcessedUserMessageEvent;
    }
  }
  return undefined;
};

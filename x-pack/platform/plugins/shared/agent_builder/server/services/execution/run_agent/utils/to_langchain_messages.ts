/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage, HumanMessage } from '@langchain/core/messages';
import type { AIMessage } from '@langchain/core/messages';
import type { AssistantResponse, ConversationRoundAuthor } from '@kbn/agent-builder-common';
import { getConversationRoundAuthorDisplayName } from '@kbn/agent-builder-common';
import { createAIMessage, createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import { generateXmlTree, type XmlNode } from '@kbn/agent-builder-genai-utils/tools/utils';
import type {
  ProcessedAttachment,
  ProcessedAttachmentType,
  ProcessedRoundInput,
} from '@kbn/agent-builder-server';
import type { CompactionSummary } from '@kbn/agent-builder-common';
import { formatExecutionFailedNotice, formatSubagentRosterNotice } from '../prompts/utils/notices';
import { formatDate } from '../prompts/utils/helpers';
import type { ProcessedConversation } from './prepare_conversation';
import {
  groupTimelineRounds,
  groupTimelineEntries,
  isTimelineFailedExecution,
  type TimelineFailedExecution,
  isAwaitingPrompt,
  isTimelineRound,
  roundResponse,
  type ProcessedTimelineEvent,
  type TimelineRound,
} from './context_timeline';
import type { ToolCallResultTransformer } from './tool_summarization';
import { serializeCompactionSummary } from './compaction_serialize';
import { renderHistorySteps } from './render_steps_to_messages';
import { attachmentTypeInstructions } from '../prompts/utils/attachments';

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
   * Optional compaction summary to inject before the remaining rounds.
   * When provided, the summary is serialized and prepended as a
   * user/assistant message pair representing the compacted history.
   */
  compactionSummary?: CompactionSummary;
  /**
   * Timestamp of the current (in-progress) round. When provided, it is
   * prefixed onto the next-input user message. Previous rounds always use
   * their own `started_at`. Kept out of the system prompt so the system+tools
   * prefix stays stable across rounds (prompt-cache friendly).
   */
  conversationTimestamp?: string;
}

/**
 * Builds the LangChain message history from the processed timeline, one round group at a time.
 * When `resultTransformer` is provided, previous rounds' tool results are passed through it.
 */
export const prepareMessages = async ({
  conversation,
  resultTransformer,
  ignoreSteps = false,
  compactionSummary,
  conversationTimestamp,
}: ConversationToLangchainOptions): Promise<BaseMessage[]> => {
  const subagentRosterFallback = conversation.subagentRosterFallback;
  const messages: BaseMessage[] = [];
  const attachmentTypeInstructionsProvided = new Set<string>();

  const previousRounds = groupTimelineRounds(conversation.timeline);
  let entries = groupTimelineEntries(conversation.timeline);
  let input = conversation.nextInput;
  let inputTimestamp = conversationTimestamp;

  // need to ignore the last round if it's awaiting a prompt, the graph handles resuming the actions
  // we also uses the last message's input as the "next" input (given the actual input will be the prompt response)
  const lastRound = previousRounds[previousRounds.length - 1];
  if (lastRound && isAwaitingPrompt(lastRound)) {
    entries = entries.filter((entry) => !isTimelineRound(entry) || entry.id !== lastRound.id);
    input = lastRound.userMessage.data;
    inputTimestamp = lastRound.userMessage.created_at;
  }

  // Inject compaction summary as a user/assistant exchange before remaining rounds
  if (compactionSummary) {
    const summaryText = serializeCompactionSummary(compactionSummary.structured_data);
    messages.push(createUserMessage('[Previous conversation context was compacted]'));
    messages.push(createAIMessage(summaryText));

    // Inject back subagent roaster notice after compaction
    if (subagentRosterFallback && Object.keys(subagentRosterFallback).length > 0) {
      const fallbackRoster = Object.entries(subagentRosterFallback).map(([name, entry]) => ({
        name,
        conversation_id: entry.conversation_id,
      }));
      messages.push(createUserMessage(formatSubagentRosterNotice(fallbackRoster)));
    }
  }

  for (const entry of entries) {
    if (isTimelineRound(entry)) {
      messages.push(
        ...(await roundToLangchain(entry, {
          resultTransformer,
          ignoreSteps,
          attachmentTypes: conversation.attachmentTypes,
          attachmentTypeInstructionsProvided,
        }))
      );
      continue;
    }
    if (isTimelineFailedExecution(entry)) {
      messages.push(
        ...failedExecutionToLangchain(entry, {
          attachmentTypes: conversation.attachmentTypes,
          attachmentTypeInstructionsProvided,
        })
      );
      continue;
    }
    // a standalone user message: no execution to render
    messages.push(
      formatUserInput({
        input: entry.userMessage.data,
        timestamp: entry.userMessage.created_at,
        attachmentTypes: conversation.attachmentTypes,
        attachmentTypeInstructionsProvided,
      })
    );
  }

  messages.push(
    formatUserInput({
      input,
      timestamp: inputTimestamp,
      attachmentTypes: conversation.attachmentTypes,
      attachmentTypeInstructionsProvided,
    })
  );

  return messages;
};

export interface RoundToLangchainOptions {
  resultTransformer?: ToolCallResultTransformer;
  ignoreSteps?: boolean;
  attachmentTypes?: ProcessedAttachmentType[];
  attachmentTypeInstructionsProvided?: Set<string>;
}

export const roundToLangchain = async (
  round: TimelineRound<ProcessedTimelineEvent>,
  {
    resultTransformer,
    ignoreSteps = false,
    attachmentTypes,
    attachmentTypeInstructionsProvided,
  }: RoundToLangchainOptions = {}
): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];

  // user message
  messages.push(
    formatUserInput({
      input: round.userMessage.data,
      timestamp: round.userMessage.created_at,
      attachmentTypes,
      attachmentTypeInstructionsProvided,
    })
  );

  // steps
  if (!ignoreSteps) {
    messages.push(...(await renderHistorySteps({ steps: round.steps, resultTransformer })));
  }

  // assistant response
  messages.push(formatAssistantResponse({ response: roundResponse(round) }));

  return messages;
};

/**
 * The two messages a failed initial execution contributes to the history: the user message it
 * answered nothing to, and a system notice saying the attempt failed. Its steps are not rendered.
 */
export const failedExecutionToLangchain = (
  entry: TimelineFailedExecution<ProcessedTimelineEvent>,
  {
    attachmentTypes,
    attachmentTypeInstructionsProvided,
  }: Pick<RoundToLangchainOptions, 'attachmentTypes' | 'attachmentTypeInstructionsProvided'> = {}
): BaseMessage[] => [
  formatUserInput({
    input: entry.userMessage.data,
    timestamp: entry.userMessage.created_at,
    attachmentTypes,
    attachmentTypeInstructionsProvided,
  }),
  createUserMessage(formatExecutionFailedNotice(entry.failed.data.error)),
];

export const formatUserInput = ({
  input,
  timestamp,
  attachmentTypes,
  attachmentTypeInstructionsProvided,
}: {
  input: ProcessedRoundInput;
  timestamp?: string;
  attachmentTypes?: ProcessedAttachmentType[];
  attachmentTypeInstructionsProvided?: Set<string>;
}): HumanMessage => {
  const { message, attachments, attachment_context, attachment_refs, author } = input;

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
  if (attachment_context) {
    content += `\n\n${attachment_context}\n`;
  }
  if (
    attachment_refs &&
    attachment_refs.length > 0 &&
    attachmentTypes &&
    attachmentTypeInstructionsProvided
  ) {
    const roundAttachmentTypes: ProcessedAttachmentType[] = [];
    for (const ref of attachment_refs) {
      if (ref.type && !attachmentTypeInstructionsProvided.has(ref.type)) {
        attachmentTypeInstructionsProvided.add(ref.type);
        const processedType = attachmentTypes.find((type) => type.type === ref.type);
        if (processedType) {
          roundAttachmentTypes.push(processedType);
        }
      }
    }
    if (roundAttachmentTypes.length > 0) {
      const attachmentsInstructions = attachmentTypeInstructions(roundAttachmentTypes);

      content += `\n\n${attachmentsInstructions}\n`;
    }
  }

  const prefix = formatInputPrefix({ author, timestamp });
  if (prefix) {
    content = `${prefix}\n\n${content}`;
  }

  return createUserMessage(content);
};

const formatInputPrefix = ({
  author,
  timestamp,
}: {
  author?: ConversationRoundAuthor;
  timestamp?: string;
}): string | undefined => {
  const parts: string[] = [];
  const authorLabel = getAuthorLabel(author);
  if (authorLabel) {
    parts.push(`User: ${authorLabel}`);
  }
  if (timestamp && timestamp !== new Date(0).toISOString()) {
    parts.push(`Sent: ${formatDate(timestamp)}`);
  }
  if (parts.length === 0) {
    return undefined;
  }
  return `[${parts.join(' — ')}]`;
};

const getAuthorLabel = (author?: ConversationRoundAuthor): string | undefined => {
  if (!author) return undefined;

  const displayName = getConversationRoundAuthorDisplayName(author);

  if (displayName) {
    return displayName;
  }

  return author.id;
};

const formatAttachment = ({ attachment }: { attachment: ProcessedAttachment }): XmlNode => {
  const { representation } = attachment;
  return {
    tagName: 'attachment',
    attributes: {
      type: attachment.attachment.type,
      id: attachment.attachment.id,
    },
    children: [representation.type === 'text' ? representation.value : ''],
  };
};

const formatAssistantResponse = ({ response }: { response: AssistantResponse }): AIMessage => {
  return createAIMessage(response.message);
};

export { groupToolCallSteps } from './render_steps_to_messages';

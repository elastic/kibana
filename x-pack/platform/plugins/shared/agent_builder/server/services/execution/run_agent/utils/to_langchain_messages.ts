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
import { formatInterruptionNotice, formatSubagentRosterNotice } from '../prompts/utils/notices';
import { formatDate } from '../prompts/utils/helpers';
import type { ProcessedConversation } from './prepare_conversation';
import {
  isTimelineRound,
  roundInterruption,
  roundResponse,
  type ProcessedTimelineEvent,
  type TimelineRound,
} from './context_timeline';
import { FULLY_VISIBLE, historyView, type ContextVisibility } from './context_coverage';
import type { ToolCallResultTransformer } from './tool_summarization';
import { serializeCompactionSummary } from './compaction_serialize';
import { renderHistorySteps } from './render_steps_to_messages';
import { attachmentTypeInstructions } from '../prompts/utils/attachments';

export interface ConversationToLangchainOptions {
  conversation: ProcessedConversation;
  /**
   * Optional transformer of the tool call results of a given round.
   * Defaults to identity (no transformation).
   */
  roundResultTransformer?: (roundId: string) => ToolCallResultTransformer;
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
  /** What the summary leaves visible (see `resolveVisibility`); everything by default. */
  visibility?: ContextVisibility;
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
 * When `roundResultTransformer` is provided, previous rounds' tool results are passed through it.
 */
export const prepareMessages = async ({
  conversation,
  roundResultTransformer,
  ignoreSteps = false,
  compactionSummary,
  visibility = FULLY_VISIBLE,
  conversationTimestamp,
}: ConversationToLangchainOptions): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];
  const attachmentTypeInstructionsProvided = new Set<string>();

  // a round awaiting a prompt is left to the graph, which resumes it
  const { entries, input, inputTimestamp } = historyView(conversation, conversationTimestamp);

  if (compactionSummary) {
    messages.push(
      ...compactionSummaryMessages(compactionSummary, conversation.subagentRosterFallback)
    );
  }

  const visibleEntries = entries.slice(visibility.hiddenEntryCount);
  for (const [index, entry] of visibleEntries.entries()) {
    if (isTimelineRound(entry)) {
      messages.push(
        ...(await roundToLangchain(entry, {
          resultTransformer: roundResultTransformer?.(entry.id),
          ignoreSteps,
          attachmentTypes: conversation.attachmentTypes,
          attachmentTypeInstructionsProvided,
          fromStepIndex: index === 0 ? visibility.entryFromStep : 0,
        }))
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

/** The summary as a user/assistant exchange, followed by the sub-agent roster it would hide. */
export const compactionSummaryMessages = (
  summary: CompactionSummary,
  subagentRosterFallback?: ProcessedConversation['subagentRosterFallback']
): BaseMessage[] => {
  const messages: BaseMessage[] = [
    createUserMessage('[Previous conversation context was compacted]'),
    createAIMessage(serializeCompactionSummary(summary.structured_data)),
  ];
  if (subagentRosterFallback && Object.keys(subagentRosterFallback).length > 0) {
    const fallbackRoster = Object.entries(subagentRosterFallback).map(([name, entry]) => ({
      name,
      conversation_id: entry.conversation_id,
    }));
    messages.push(createUserMessage(formatSubagentRosterNotice(fallbackRoster)));
  }
  return messages;
};

export interface RoundToLangchainOptions {
  resultTransformer?: ToolCallResultTransformer;
  ignoreSteps?: boolean;
  attachmentTypes?: ProcessedAttachmentType[];
  attachmentTypeInstructionsProvided?: Set<string>;
  /**
   * First step to render, for a round partially covered by the compaction summary. The user
   * message is kept so the visible steps stay anchored to the request they answer.
   */
  fromStepIndex?: number;
}

export const roundToLangchain = async (
  round: TimelineRound<ProcessedTimelineEvent>,
  {
    resultTransformer,
    ignoreSteps = false,
    attachmentTypes,
    attachmentTypeInstructionsProvided,
    fromStepIndex = 0,
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
    messages.push(
      ...(await renderHistorySteps({
        steps: round.steps.slice(fromStepIndex),
        resultTransformer,
      }))
    );
  }

  messages.push(roundOutcomeMessage(round));

  return messages;
};

/** The round's assistant response, or the notice standing in for it on an interrupted round. */
export const roundOutcomeMessage = (round: TimelineRound<ProcessedTimelineEvent>): BaseMessage => {
  const interruption = roundInterruption(round);
  return interruption
    ? createUserMessage(formatInterruptionNotice(interruption))
    : formatAssistantResponse({ response: roundResponse(round) });
};

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

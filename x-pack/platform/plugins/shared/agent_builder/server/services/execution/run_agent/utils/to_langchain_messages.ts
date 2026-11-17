/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage, HumanMessage } from '@langchain/core/messages';
import type { AIMessage } from '@langchain/core/messages';
import type {
  AssistantResponse,
  ConversationRoundAuthor,
  ConversationRoundStep,
} from '@kbn/agent-builder-common';
import {
  getConversationRoundAuthorDisplayName,
  isAskUserQuestionStep,
  isAttachmentEvent,
} from '@kbn/agent-builder-common';
import { createAIMessage, createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import { generateXmlTree, type XmlNode } from '@kbn/agent-builder-genai-utils/tools/utils';
import type { ProcessedAttachment, ProcessedRoundInput } from '@kbn/agent-builder-server';
import type { CompactionSummary } from '@kbn/agent-builder-common';
import {
  formatAwaitingPromptNotice,
  formatInterruptionNotice,
  formatSubagentRosterNotice,
} from '../prompts/utils/notices';
import { formatDate } from '../prompts/utils/helpers';
import type { ProcessedConversation } from './prepare_conversation';
import {
  isAwaitingPrompt,
  isTimelineStandaloneEvent,
  isTimelineRound,
  roundInterruption,
  roundResponse,
  type ProcessedStandaloneEvent,
  type ProcessedTimelineEvent,
  type TimelineRound,
} from './context_timeline';
import { FULLY_VISIBLE, historyView, type ContextVisibility } from './context_coverage';
import type { ToolCallResultTransformer } from './tool_summarization';
import { serializeCompactionSummary } from './compaction_serialize';
import { renderHistorySteps } from './render_steps_to_messages';
import { formatConversationEvent } from './conversation_event_presentation';
import {
  createAttachmentNoticeRenderer,
  type AttachmentNoticeRenderer,
} from './attachment_event_presentation';
import {
  placeRoundAttachmentEvents,
  type ResumeAnchors,
  type RoundAttachmentPlacement,
} from './attachment_placement';

/** The notice renderer of one prompt build; per-type instructions are given once across it. */
export const noticeRendererFor = (
  conversation: Pick<ProcessedConversation, 'attachmentTypes' | 'describeAttachmentType'>,
  { withTypeInstructions = true }: { withTypeInstructions?: boolean } = {}
): AttachmentNoticeRenderer => {
  const renderer = createAttachmentNoticeRenderer({
    describeType: (type) =>
      conversation.describeAttachmentType
        ? conversation.describeAttachmentType(type)
        : conversation.attachmentTypes.find((candidate) => candidate.type === type)?.description,
    withTypeInstructions,
  });
  const listed = new Set(conversation.attachmentTypes.map(({ type }) => type));
  return {
    ...renderer,
    // Stored data (legacy refs, standalone events) only gets the instructions of the types the
    // conversation lists, as legacy refs always did.
    typeInstructions: (types) =>
      renderer.typeInstructions(types.filter((type) => listed.has(type))),
  };
};

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
  /** Shared with the current-run rendering of the same prompt; one per prompt build by default. */
  attachmentNotices?: AttachmentNoticeRenderer;
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
  attachmentNotices,
}: ConversationToLangchainOptions): Promise<BaseMessage[]> => {
  const messages: BaseMessage[] = [];
  const notices = attachmentNotices ?? noticeRendererFor(conversation);

  // the round this run resumes is left to the graph
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
          notices,
          resumeAnchors: conversation.resumeAnchors,
          fromStepIndex: index === 0 ? visibility.entryFromStep : 0,
        }))
      );
      continue;
    }
    if (isTimelineStandaloneEvent(entry)) {
      messages.push(standaloneEventToLangchain(entry.event, notices));
      continue;
    }
    // a standalone user message: no execution to render
    messages.push(
      formatUserInput({
        input: entry.userMessage.data,
        timestamp: entry.userMessage.created_at,
        notices,
      })
    );
  }

  messages.push(formatUserInput({ input, timestamp: inputTimestamp, notices }));

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
  notices: AttachmentNoticeRenderer;
  resumeAnchors?: ResumeAnchors;
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
    notices,
    resumeAnchors,
    fromStepIndex = 0,
  }: RoundToLangchainOptions
): Promise<BaseMessage[]> => {
  const placement = roundAttachmentPlacement(round, resumeAnchors);
  const messages: BaseMessage[] = [
    formatUserInput({
      input: round.userMessage.data,
      timestamp: round.userMessage.created_at,
      notices,
    }),
  ];
  if (!ignoreSteps) {
    messages.push(
      ...(await renderHistorySteps({
        steps: round.steps.slice(fromStepIndex),
        resultTransformer,
        attachments: { placement, notices },
      }))
    );
  }
  messages.push(roundOutcomeMessage(round), ...roundOutcomeNotice(placement, notices));
  return messages;
};

/** Placement of a history round's attachment events. */
export const roundAttachmentPlacement = (
  round: TimelineRound<ProcessedTimelineEvent>,
  resumeAnchors: ResumeAnchors = new Map()
): RoundAttachmentPlacement =>
  placeRoundAttachmentEvents({
    steps: round.steps,
    events: round.events.filter(isAttachmentEvent),
    resumeAnchors,
    userMessageId: round.userMessage.id,
  });

/** The notice after a round's outcome: its changes made outside any tool call group. */
export const roundOutcomeNotice = (
  placement: RoundAttachmentPlacement,
  notices: AttachmentNoticeRenderer
): BaseMessage[] => {
  const notice = notices.render(placement.afterOutcome);
  return notice ? [createUserMessage(notice)] : [];
};

/**
 * The round's assistant response, or the notice standing in for it on an interrupted or paused
 * round.
 */
export const roundOutcomeMessage = (round: TimelineRound<ProcessedTimelineEvent>): BaseMessage => {
  if (isAwaitingPrompt(round)) {
    return createUserMessage(formatAwaitingPromptNotice(unansweredQuestions(round.steps)));
  }
  const interruption = roundInterruption(round);
  return interruption
    ? createUserMessage(formatInterruptionNotice(interruption))
    : formatAssistantResponse({ response: roundResponse(round) });
};

const unansweredQuestions = (steps: ConversationRoundStep[]): string[] =>
  steps.flatMap((step) =>
    isAskUserQuestionStep(step) && step.answers === undefined
      ? step.questions.map(({ question }) => question)
      : []
  );

/**
 * The message a standalone event contributes to the history: a user-role message carrying the
 * event's LLM representation, like the other system notices, then its type's instructions for an
 * attachment event.
 */
export const standaloneEventToLangchain = (
  event: ProcessedStandaloneEvent,
  notices?: AttachmentNoticeRenderer
): HumanMessage => {
  const block = formatConversationEvent(event);
  const instructions =
    notices && isAttachmentEvent(event)
      ? notices.typeInstructions([event.data.attachment_type])
      : '';
  return createUserMessage(instructions ? `${block}\n\n${instructions}` : block);
};

export const formatUserInput = ({
  input,
  timestamp,
  notices,
}: {
  input: ProcessedRoundInput;
  timestamp?: string;
  notices: AttachmentNoticeRenderer;
}): HumanMessage => {
  const {
    message,
    attachments,
    attachment_context,
    attachment_refs,
    attachment_events: inputEvents = [],
    author,
  } = input;

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
  if (attachment_refs && attachment_refs.length > 0) {
    const legacyInstructions = notices.typeInstructions(
      attachment_refs.map((ref) => ref.type).filter((type): type is string => !!type)
    );
    if (legacyInstructions) {
      content += `\n\n${legacyInstructions}\n`;
    }
  }
  const inputNotice = notices.render(inputEvents);
  if (inputNotice) {
    content += `\n\n${inputNotice}`;
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

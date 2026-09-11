/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionSummary,
  ConversationAction,
  ConversationRoundAuthor,
  ConverseInput,
  RoundInput,
  MetadataFieldValue,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import { createBadRequestError, TimelineEventType } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { ProcessedAttachmentType, ProcessedRoundInput } from '@kbn/agent-builder-server';
import type {
  AttachmentResolveContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AgentHandlerContext } from '@kbn/agent-builder-server/agents';

import { mergeAttachmentInputs } from '../../../attachments/merge_attachment_inputs';
import { mergeAttachmentRefs } from '../../../conversation/client/migrate_attachments';
import { authorAndOrigin } from '../../../conversation/client/events_to_rounds';
import { formatAttachmentsMetadata } from './attachment_presentation';
import type {
  ProcessedTimelineEvent,
  ProcessedUserMessageEvent,
  TimelineRound,
} from './context_timeline';
import { groupTimelineRounds, groupTimelineEntries } from './context_timeline';

export interface ProcessedConversation {
  /**
   * The agent-context timeline: the previous rounds' events in order, with each `user_message`
   * payload processed. Compaction drops the events of summarized rounds.
   */
  timeline: ProcessedTimelineEvent[];
  nextInput: ProcessedRoundInput;
  attachmentTypes: ProcessedAttachmentType[];
  attachmentStateManager: AttachmentStateManager;
  /** Compaction summary covering older rounds that were replaced by this summary */
  compactionSummary?: CompactionSummary;
  /** Persistent sub-agent roster */
  subagentRosterFallback?: Record<string, string>;
  /**
   * Deserialized metadata from the active conversation template.
   * Populated from `conversation.metadata` at prepare time so prompt factories
   * receive it via `processedConversation` rather than as a separate parameter.
   */
  metadata?: Record<string, MetadataFieldValue>;
  /** ID of the template applied to this conversation, used to look up field definitions. */
  template_id?: string;
}

/**
 * Prepare the rounds and input based on the action.
 * - 'regenerate': Strip the last round and use its input for re-execution
 * - Default: Use rounds and input as provided
 */
const prepareForAction = ({
  action,
  rounds,
  nextInput,
}: {
  action?: ConversationAction;
  rounds: TimelineRound[];
  nextInput: ConverseInput;
}): { effectiveRounds: TimelineRound[]; effectiveNextInput: ConverseInput } => {
  if (action === 'regenerate') {
    if (rounds.length === 0) {
      throw createBadRequestError('Cannot regenerate: conversation has no rounds');
    }
    const lastRound = rounds[rounds.length - 1];
    // Faithfully replay the original request by copying the full stored input shape
    return {
      effectiveRounds: rounds.slice(0, -1),
      effectiveNextInput: { ...lastRound.userMessage.data },
    };
  }

  return { effectiveRounds: rounds, effectiveNextInput: nextInput };
};

export const prepareConversation = async ({
  timeline,
  nextInput,
  nextInputAuthor,
  context,
  action,
  metadata,
  templateId,
}: {
  /** The conversation's normalized context timeline (see `eventsForContext`). */
  timeline: TimelineEvent[];
  nextInput: ConverseInput;
  nextInputAuthor?: ConversationRoundAuthor;
  context: AgentHandlerContext;
  action?: ConversationAction;
  metadata?: Record<string, MetadataFieldValue>;
  templateId?: string;
}): Promise<ProcessedConversation> => {
  const { attachments: attachmentsService, attachmentStateManager } = context;
  const resolveContext: AttachmentResolveContext = {
    request: context.request,
    spaceId: context.spaceId,
    savedObjectsClient: context.savedObjectsClient,
  };

  // Handle regenerate action: use last round's input and strip it from the timeline
  const { effectiveRounds, effectiveNextInput } = prepareForAction({
    action,
    rounds: groupTimelineRounds(timeline),
    nextInput,
  });

  // Process complete executions and independent messages in order so attachment versions
  // resolve consistently. Incomplete execution inputs remain outside the model history.
  const processedInputs: ProcessedRoundInput[] = [];
  const processedTimeline: ProcessedTimelineEvent[] = [];
  const includedRounds = new Set(effectiveRounds.map((round) => round.id));
  for (const round of groupTimelineEntries(timeline)) {
    if ('terminated' in round && !includedRounds.has(round.id)) continue;
    attachmentStateManager.clearAccessTracking();
    const input = round.userMessage.data;
    if (input.attachments && input.attachments.length > 0) {
      await mergeAttachmentInputs({
        stateManager: attachmentStateManager,
        inputs: input.attachments,
        actor: ATTACHMENT_REF_ACTOR.user,
        resolveContext,
      });
    }
    const attachmentRefs = mergeAttachmentRefs(
      input.attachment_refs,
      attachmentStateManager.getAccessedRefs()
    );
    const processedInput = prepareRoundInput({
      input: { ...input, attachments: [], attachment_refs: attachmentRefs },
      author: authorAndOrigin(round.userMessage).author,
      attachmentStateManager,
    });
    processedInputs.push(processedInput);

    const processedUserMessage: ProcessedUserMessageEvent = {
      ...round.userMessage,
      data: processedInput,
    };
    for (const event of round.events) {
      if (event === round.userMessage) {
        processedTimeline.push(processedUserMessage);
      } else if (event.type !== TimelineEventType.userMessage) {
        processedTimeline.push(event);
      }
    }
  }

  attachmentStateManager.clearAccessTracking();
  const nextInputAttachments = (effectiveNextInput.attachments ?? []) as AttachmentInput[];
  await mergeAttachmentInputs({
    stateManager: attachmentStateManager,
    inputs: nextInputAttachments,
    actor: ATTACHMENT_REF_ACTOR.user,
    resolveContext,
    updateOriginSnapshot: true,
  });
  const nextInputAccessedRefs = attachmentStateManager.getAccessedRefs();
  const mergedNextInputRefs = mergeAttachmentRefs(
    effectiveNextInput.attachment_refs,
    nextInputAccessedRefs
  );

  const strippedNextInput: ConverseInput = {
    ...effectiveNextInput,
    attachments: [],
    ...(mergedNextInputRefs ? { attachment_refs: mergedNextInputRefs } : {}),
  };
  const processedNextInput = prepareRoundInput({
    input: strippedNextInput,
    author: nextInputAuthor,
    attachmentStateManager,
  });

  const roundAttachmentTypes = [
    ...(processedNextInput.attachment_refs ?? []),
    ...processedInputs.flatMap((input) => input.attachment_refs ?? []),
  ]
    .map((ar) => ar.type)
    .filter((type): type is string => !!type);

  const conversationAttachmentTypes = attachmentStateManager.getActive().map((a) => a.type);
  const attachmentTypeIds = [
    ...new Set<string>([...conversationAttachmentTypes, ...roundAttachmentTypes]),
  ];

  const attachmentTypes = await Promise.all(
    attachmentTypeIds.map<Promise<ProcessedAttachmentType>>(async (type) => {
      const definition = attachmentsService.getTypeDefinition(type);
      const description = definition?.getAgentDescription?.() ?? undefined;
      return {
        type,
        description,
      };
    })
  );

  return {
    nextInput: processedNextInput,
    timeline: processedTimeline,
    attachmentTypes,
    attachmentStateManager,
    ...(metadata !== undefined ? { metadata } : {}),
    ...(templateId !== undefined ? { template_id: templateId } : {}),
  };
};

const prepareRoundInput = ({
  input,
  author,
  attachmentStateManager,
}: {
  input: RoundInput | ConverseInput;
  author?: ConversationRoundAuthor;
  attachmentStateManager: AttachmentStateManager;
}): ProcessedRoundInput => {
  const inputAttachments: Partial<ProcessedRoundInput> = {};
  if (input.attachment_refs) {
    inputAttachments.attachment_refs = input.attachment_refs.map((ref) => ({
      ...ref,
      type: attachmentStateManager.getAttachmentRecord(ref.attachment_id)?.type,
    }));
    if ('attachment_context' in input && input.attachment_context) {
      inputAttachments.attachment_context = input.attachment_context;
    } else {
      inputAttachments.attachment_context = formatAttachmentsMetadata(
        input.attachment_refs,
        attachmentStateManager
      );
    }
  }

  return {
    message: input.message ?? '',
    // attachments are always stripped before this function. this is here to satisfy the type
    // for legacy compatibility
    attachments: [],
    ...(author !== undefined ? { author } : {}),
    ...inputAttachments,
  };
};

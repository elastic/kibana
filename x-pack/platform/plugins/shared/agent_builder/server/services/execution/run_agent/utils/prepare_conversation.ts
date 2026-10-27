/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationEvent,
  ConversationRoundAuthor,
  ConverseInput,
  MetadataFieldValue,
  SubagentEntry,
  UserMessageEventData,
} from '@kbn/agent-builder-common';
import { TimelineEventType, isAttachmentEvent, isTimelineEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { ProcessedAttachmentType, ProcessedRoundInput } from '@kbn/agent-builder-server';
import type {
  AttachmentResolveContext,
  AttachmentStateManager,
  AttachmentValidateContext,
} from '@kbn/agent-builder-server/attachments';
import type { AgentHandlerContext } from '@kbn/agent-builder-server/agents';

import { mergeAttachmentInputs } from '../../../attachments/merge_attachment_inputs';
import { authorAndOrigin } from '../../../conversation/client/events_to_rounds';
import { formatAttachmentEvent } from './attachment_event_presentation';
import type { ResumeAnchors } from './attachment_placement';
import { formatAttachmentsMetadata } from './attachment_presentation';
import type {
  ContextTimelineEvent,
  ProcessedStandaloneEvent,
  ProcessedTimelineEvent,
  ProcessedUserMessageEvent,
} from './context_timeline';
import {
  groupTimelineRounds,
  groupTimelineEntries,
  isTimelineStandaloneEvent,
  isTimelineRound,
  linkedInputEvents,
} from './context_timeline';

export interface ProcessedConversation {
  /**
   * The agent-context timeline: the previous rounds' events in order, with each `user_message`
   * payload processed. Never trimmed: what a compaction summary covers is hidden at render time.
   */
  timeline: ProcessedTimelineEvent[];
  nextInput: ProcessedRoundInput;
  attachmentTypes: ProcessedAttachmentType[];
  /** Description of an attachment type, resolved when rendering (types can appear mid-run). */
  describeAttachmentType?: (type: string) => string | undefined;
  /** Where each resume's input attachments render: `prompt_response` id → the items its pause waited on. */
  resumeAnchors?: ResumeAnchors;
  attachmentStateManager: AttachmentStateManager;
  /** Persistent sub-agent roster */
  subagentRosterFallback?: Record<string, SubagentEntry>;
  /**
   * Deserialized metadata from the active conversation template.
   * Populated from `conversation.metadata` at prepare time so prompt factories
   * receive it via `processedConversation` rather than as a separate parameter.
   */
  metadata?: Record<string, MetadataFieldValue>;
  /** ID of the template applied to this conversation, used to look up field definitions. */
  template_id?: string;
  /**
   * Id of the paused round this run resumes. Only that round is left out of the history; a paused
   * round the run does not resume is rendered as history.
   */
  resumedRoundId?: string;
}

export const prepareConversation = async ({
  timeline,
  nextInput,
  nextInputAuthor,
  context,
  metadata,
  templateId,
  resumeAnchors,
}: {
  /** The conversation's normalized context timeline (see `eventsForContext`). */
  timeline: ContextTimelineEvent[];
  nextInput: ConverseInput;
  nextInputAuthor?: ConversationRoundAuthor;
  context: AgentHandlerContext;
  metadata?: Record<string, MetadataFieldValue>;
  templateId?: string;
  resumeAnchors?: ResumeAnchors;
}): Promise<ProcessedConversation> => {
  const { attachments: attachmentsService, attachmentStateManager } = context;
  const resolveContext: AttachmentResolveContext = {
    request: context.request,
    spaceId: context.spaceId,
    savedObjectsClient: context.savedObjectsClient,
  };
  const validateContext: AttachmentValidateContext = {
    request: context.request,
  };

  const effectiveRounds = groupTimelineRounds(timeline);
  const effectiveNextInput = nextInput;

  // Process complete executions, independent messages and standalone events in order so attachment
  // versions resolve consistently. Incomplete execution inputs remain outside the model history.
  const processedInputs: ProcessedRoundInput[] = [];
  const processedTimeline: ProcessedTimelineEvent[] = [];
  const includedRounds = new Set(effectiveRounds.map((round) => round.id));
  for (const round of groupTimelineEntries(timeline)) {
    if (isTimelineStandaloneEvent(round)) {
      // Rendered unescaped, so never taken from the stored event.
      const processedEvent = isAttachmentEvent(round.event)
        ? {
            ...round.event,
            representation: { type: 'text' as const, value: formatAttachmentEvent(round.event) },
          }
        : await processCustomEvent({ event: round.event, context });
      if (processedEvent) {
        processedTimeline.push(processedEvent);
      }
      continue;
    }
    if (isTimelineRound(round) && !includedRounds.has(round.id)) continue;
    const input = round.userMessage.data;
    if (input.attachments && input.attachments.length > 0) {
      await mergeAttachmentInputs({
        stateManager: attachmentStateManager,
        inputs: input.attachments,
        actor: ATTACHMENT_REF_ACTOR.user,
        resolveContext,
        validateContext,
      });
    }
    const processedInput = prepareRoundInput({
      input: { ...input, attachments: [] },
      author: authorAndOrigin(round.userMessage).author,
      attachmentStateManager,
    });
    processedInputs.push(processedInput);

    const inputEvents = linkedInputEvents(round.events, round.userMessage.id);
    const processedUserMessage: ProcessedUserMessageEvent = {
      ...round.userMessage,
      data:
        inputEvents.length > 0
          ? { ...processedInput, attachment_events: inputEvents }
          : processedInput,
    };
    // A round carries its user message and its run; a standalone message itself and its inputs.
    const events = isTimelineRound(round) ? round.events : [round.userMessage, ...round.events];

    for (const event of events) {
      if (event.id === round.userMessage.id) {
        processedTimeline.push(processedUserMessage);
      } else if (isTimelineEvent(event) && event.type !== TimelineEventType.userMessage) {
        processedTimeline.push(event);
      }
    }
  }

  // History re-migration above is idempotent bookkeeping, not a user action: drop its changes so
  // only the next input's attachments surface as chat_input attachment events.
  attachmentStateManager.clearChanges();
  const nextInputAttachments = (effectiveNextInput.attachments ?? []) as AttachmentInput[];
  await mergeAttachmentInputs({
    stateManager: attachmentStateManager,
    inputs: nextInputAttachments,
    actor: ATTACHMENT_REF_ACTOR.user,
    resolveContext,
    validateContext,
    updateOriginSnapshot: true,
  });
  const processedNextInput = prepareRoundInput({
    input: { message: effectiveNextInput.message ?? '' },
    author: nextInputAuthor,
    attachmentStateManager,
  });

  const legacyRefTypes = processedInputs
    .flatMap((input) => input.attachment_refs ?? [])
    .map((ref) => ref.type)
    .filter((type): type is string => !!type);
  const eventTypes = processedTimeline
    .filter(isAttachmentEvent)
    .map((event) => event.data.attachment_type);
  const conversationAttachmentTypes = attachmentStateManager.getActive().map((a) => a.type);
  const attachmentTypeIds = [
    ...new Set<string>([...conversationAttachmentTypes, ...legacyRefTypes, ...eventTypes]),
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
    describeAttachmentType: (type) =>
      attachmentsService.getTypeDefinition(type)?.getAgentDescription?.() ?? undefined,
    attachmentStateManager,
    ...(resumeAnchors ? { resumeAnchors } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
    ...(templateId !== undefined ? { template_id: templateId } : {}),
  };
};

/**
 * Resolves a custom event's LLM representation through its registered type definition. Events
 * whose type is unknown (logged) or defines no `format` (by design) are left out of the agent
 * context; a `format` that throws is logged and skipped, so third-party code cannot sink the round.
 */
const processCustomEvent = async ({
  event,
  context,
}: {
  event: ConversationEvent;
  context: AgentHandlerContext;
}): Promise<ProcessedStandaloneEvent | undefined> => {
  const definition = context.conversationEvents?.getDefinition(event.type);
  if (!definition) {
    context.logger.debug(
      `Skipping conversation event "${event.id}": type "${event.type}" is not registered`
    );
    return undefined;
  }
  // A type without `format` opts out of the agent context by design: nothing to report.
  if (!definition.format) {
    return undefined;
  }
  try {
    // The payload was validated against `definition.payloadSchema` when the event was added.
    const representation = await definition.format(event, {
      request: context.request,
      spaceId: context.spaceId,
    });
    return { ...event, representation };
  } catch (error) {
    context.logger.warn(
      `Failed to format conversation event "${event.id}" (type "${event.type}"): ${error}`
    );
    return undefined;
  }
};

const prepareRoundInput = ({
  input,
  author,
  attachmentStateManager,
}: {
  input: UserMessageEventData;
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

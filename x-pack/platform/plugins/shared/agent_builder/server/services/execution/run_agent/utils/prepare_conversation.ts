/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionSummary,
  ConversationAction,
  ConverseInput,
  TimelineEvent,
  UserMessageEvent,
  AgentExecutionEvent,
} from '@kbn/agent-builder-common';
import {
  createBadRequestError,
  createInternalError,
  isUserMessageEvent,
  isAgentExecutionEvent,
} from '@kbn/agent-builder-common';
import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  getLatestVersion,
  getContentKey,
} from '@kbn/agent-builder-common/attachments';
import type { ProcessedAttachment, ProcessedRoundInput } from '@kbn/agent-builder-server';
import type {
  AttachmentFormatContext,
  AttachmentResolveContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';
import type { AgentHandlerContext } from '@kbn/agent-builder-server/agents';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import {
  prepareAttachmentPresentation,
  type AttachmentPresentation,
} from './attachment_presentation';

export interface ProcessedAttachmentType {
  type: string;
  description?: string;
}

/**
 * A processed user message event with formatted attachments.
 */
export type ProcessedUserMessageEvent = Omit<UserMessageEvent, 'attachments'> & {
  processedInput: ProcessedRoundInput;
};

/**
 * Union type for processed timeline events.
 */
export type ProcessedTimelineEvent = ProcessedUserMessageEvent | AgentExecutionEvent;

/**
 * Type guard for ProcessedUserMessageEvent.
 */
export const isProcessedUserMessageEvent = (
  event: ProcessedTimelineEvent
): event is ProcessedUserMessageEvent => {
  return event.type === 'user_message';
};

/**
 * Type guard for AgentExecutionEvent within ProcessedTimelineEvent.
 */
export const isProcessedAgentExecutionEvent = (
  event: ProcessedTimelineEvent
): event is AgentExecutionEvent => {
  return event.type === 'agent_execution';
};

export interface ProcessedConversation {
  /** Previous timeline events (processed user messages + agent responses) */
  previousEvents: ProcessedTimelineEvent[];
  nextInput: ProcessedRoundInput;
  attachmentTypes: ProcessedAttachmentType[];
  attachments: ProcessedAttachment[];
  attachmentStateManager: AttachmentStateManager;
  /** Presentation configuration for versioned attachments (inline vs summary mode) */
  versionedAttachmentPresentation?: AttachmentPresentation;
  /** Compaction summary covering older events that were replaced by this summary */
  compactionSummary?: CompactionSummary;
}

const createFormatContext = (agentContext: AgentHandlerContext): AttachmentFormatContext => {
  return {
    request: agentContext.request,
    spaceId: agentContext.spaceId,
  };
};

/**
 * Promote legacy per-round attachments into conversation-level versioned attachments.
 **/
const mergeInputAttachmentsIntoAttachmentState = async (
  attachmentStateManager: AttachmentStateManager,
  inputs: AttachmentInput[],
  options?: { updateOriginSnapshot?: boolean; resolveContext?: AttachmentResolveContext }
) => {
  if (inputs.length === 0) return;

  const existingByContentKey = new Map<string, string>(); // contentKey -> attachmentId

  for (const existing of attachmentStateManager.getAll()) {
    const latest = getLatestVersion(existing);
    if (!latest) continue;
    existingByContentKey.set(`${existing.type}:${latest.content_hash}`, existing.id);
  }

  for (const input of inputs) {
    // Prefer stable IDs (if provided)
    if (input.id) {
      const existing = attachmentStateManager.getAttachmentRecord(input.id);
      if (existing) {
        await attachmentStateManager.update(
          input.id,
          {
            data: input.data,
            ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
          },
          ATTACHMENT_REF_ACTOR.user
        );
        if (options?.updateOriginSnapshot && existing.origin !== undefined) {
          await attachmentStateManager.updateOrigin(
            input.id,
            existing.origin,
            ATTACHMENT_REF_ACTOR.user
          );
        }
        continue;
      }
    }

    const contentKey = getContentKey(input, 'unknown');
    if (existingByContentKey.has(contentKey)) {
      // already present (same content), nothing to do
      continue;
    }

    const created = await attachmentStateManager.add(
      {
        ...(input.id ? { id: input.id } : {}),
        type: input.type,
        data: input.data,
        ...(input.origin !== undefined ? { origin: input.origin } : {}),
        ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.group_id !== undefined ? { group_id: input.group_id } : {}),
      },
      ATTACHMENT_REF_ACTOR.user,
      options?.resolveContext
    );

    const latest = getLatestVersion(created);
    if (latest) {
      existingByContentKey.set(`${created.type}:${latest.content_hash}`, created.id);
    }
  }
};

/**
 * Prepare timeline events and input based on the action.
 * - 'regenerate': Strip the last agent response + its user message and re-use
 * - Default: Use events and input as provided
 */
const prepareForAction = ({
  action,
  previousEvents,
  nextInput,
}: {
  action?: ConversationAction;
  previousEvents: TimelineEvent[];
  nextInput: ConverseInput;
}): { effectiveEvents: TimelineEvent[]; effectiveNextInput: ConverseInput } => {
  if (action === 'regenerate') {
    // Find the last AgentExecutionEvent
    let lastAgentIdx = -1;
    for (let i = previousEvents.length - 1; i >= 0; i--) {
      if (isAgentExecutionEvent(previousEvents[i])) {
        lastAgentIdx = i;
        break;
      }
    }
    if (lastAgentIdx === -1) {
      throw createBadRequestError('Cannot regenerate: conversation has no agent responses');
    }
    // Find the UserMessageEvent that precedes this agent response
    let userMsgIdx = -1;
    for (let i = lastAgentIdx - 1; i >= 0; i--) {
      if (isUserMessageEvent(previousEvents[i])) {
        userMsgIdx = i;
        break;
      }
    }
    const userMsg = userMsgIdx >= 0 ? (previousEvents[userMsgIdx] as UserMessageEvent) : undefined;
    const regenerateInput: ConverseInput = {
      message: userMsg?.message,
      attachments: userMsg?.attachments as AttachmentInput[] | undefined,
      attachment_refs: userMsg?.attachment_refs,
    };
    // Strip from the user message onward (or just the agent response if no user message found)
    const stripFrom = userMsgIdx >= 0 ? userMsgIdx : lastAgentIdx;
    return {
      effectiveEvents: previousEvents.slice(0, stripFrom),
      effectiveNextInput: regenerateInput,
    };
  }

  return { effectiveEvents: previousEvents, effectiveNextInput: nextInput };
};

export const prepareConversation = async ({
  previousEvents,
  nextInput,
  context,
  action,
}: {
  previousEvents: TimelineEvent[];
  nextInput: ConverseInput;
  context: AgentHandlerContext;
  action?: ConversationAction;
}): Promise<ProcessedConversation> => {
  const { attachments: attachmentsService, attachmentStateManager } = context;
  const formatContext = createFormatContext(context);
  const resolveContext: AttachmentResolveContext | undefined =
    context.savedObjectsClient !== undefined
      ? {
          request: context.request,
          spaceId: context.spaceId,
          savedObjectsClient: context.savedObjectsClient,
        }
      : undefined;

  // Handle regenerate action: strip last agent response + user message
  const { effectiveEvents, effectiveNextInput } = prepareForAction({
    action,
    previousEvents,
    nextInput,
  });

  // Promote any legacy per-event attachments into conversation-level versioned attachments.
  const userMessages = effectiveEvents.filter(isUserMessageEvent);
  const previousAttachments = userMessages.flatMap(
    (msg) => msg.attachments ?? []
  ) as AttachmentInput[];
  const nextInputAttachments = (effectiveNextInput.attachments ?? []) as AttachmentInput[];

  await mergeInputAttachmentsIntoAttachmentState(attachmentStateManager, previousAttachments, {
    resolveContext,
  });
  attachmentStateManager.clearAccessTracking();
  await mergeInputAttachmentsIntoAttachmentState(attachmentStateManager, nextInputAttachments, {
    updateOriginSnapshot: true,
    resolveContext,
  });

  const strippedNextInput: ConverseInput = { ...effectiveNextInput, attachments: [] };
  const processedNextInput = await prepareInput({
    input: strippedNextInput,
    attachmentsService,
    formatContext,
  });

  // Process each event: UserMessageEvent → ProcessedUserMessageEvent, AgentExecutionEvent → pass through
  const processedEvents: ProcessedTimelineEvent[] = await Promise.all(
    effectiveEvents.map(async (event) => {
      if (isUserMessageEvent(event)) {
        const strippedEvent: UserMessageEvent = { ...event, attachments: [] };
        const processedInput = await prepareInput({
          input: { message: strippedEvent.message, attachments: strippedEvent.attachments },
          attachmentsService,
          formatContext,
        });
        return {
          ...strippedEvent,
          processedInput,
        } as ProcessedUserMessageEvent;
      }
      // AgentExecutionEvent passes through as-is
      return event as AgentExecutionEvent;
    })
  );

  // Collect all attachments from processed user messages
  const allAttachments = [
    ...processedNextInput.attachments,
    ...processedEvents
      .filter(isProcessedUserMessageEvent)
      .flatMap((event) => event.processedInput.attachments),
  ];

  const conversationAttachmentTypes = attachmentStateManager.getActive().map((a) => a.type);
  const attachmentTypeIds = [
    ...new Set<string>([
      ...conversationAttachmentTypes,
      ...allAttachments.map((attachment) => attachment.attachment.type),
    ]),
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

  const allVersionedAttachments = attachmentStateManager.getAll();

  const versionedAttachmentPresentation = await prepareAttachmentPresentation(
    allVersionedAttachments,
    {
      resolveMaxContentLength: (attachment) =>
        attachmentsService.getTypeDefinition(attachment.type)?.maxContentLength,
    },
    async (attachment, data) => {
      const definition = attachmentsService.getTypeDefinition(attachment.type);
      if (!definition) {
        return undefined;
      }

      try {
        const typeReadonly = definition.isReadonly ?? false;
        const isReadonly = typeReadonly || attachment.readonly === true;
        if (!isReadonly) {
          return undefined;
        }
        const formatted = await definition.format(
          {
            id: attachment.id,
            type: attachment.type,
            data,
          },
          formatContext
        );
        if (!formatted?.getRepresentation) {
          return undefined;
        }
        const representation = await formatted.getRepresentation();
        return representation?.type === 'text' ? representation.value : undefined;
      } catch {
        return undefined;
      }
    }
  );

  return {
    nextInput: processedNextInput,
    previousEvents: processedEvents,
    attachmentTypes,
    attachments: allAttachments,
    attachmentStateManager,
    versionedAttachmentPresentation,
  };
};

const prepareInput = async ({
  input,
  attachmentsService,
  formatContext,
}: {
  input: ConverseInput | { message: string; attachments?: Attachment[] };
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
}): Promise<ProcessedRoundInput> => {
  let attachments: ProcessedAttachment[] = [];
  if (input.attachments?.length) {
    attachments = await Promise.all(
      input.attachments.map((attachment) => {
        return prepareAttachment({ attachment, attachmentsService, formatContext });
      })
    );
  }
  return {
    message: input.message ?? '',
    attachments,
  };
};

const prepareAttachment = async ({
  attachment: input,
  attachmentsService,
  formatContext,
}: {
  attachment: AttachmentInput;
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
}): Promise<ProcessedAttachment> => {
  const definition = attachmentsService.getTypeDefinition(input.type);
  if (!definition) {
    throw createInternalError(`Found attachment with unknown type: "${input.type}"`);
  }

  const attachment = inputToFinal(input);

  try {
    const formatted = await definition.format(attachment, formatContext);
    const tools = formatted.getBoundedTools ? await formatted.getBoundedTools() : [];
    if (!formatted.getRepresentation) {
      return {
        attachment,
        representation: { type: 'text', value: JSON.stringify(attachment.data) },
        tools,
      };
    }
    const representation = await formatted.getRepresentation();

    return {
      attachment,
      representation,
      tools,
    };
  } catch (e) {
    return {
      attachment,
      representation: { type: 'text', value: JSON.stringify(attachment.data) },
      tools: [],
    };
  }
};

const inputToFinal = (input: AttachmentInput): Attachment => {
  if (input.data === undefined) {
    throw createInternalError(
      'Attachment is missing data; by-reference attachments must be resolved before formatting'
    );
  }
  return {
    id: input.id ?? getToolResultId(),
    type: input.type,
    data: input.data,
    hidden: input.hidden,
    origin: input.origin,
  } as Attachment;
};

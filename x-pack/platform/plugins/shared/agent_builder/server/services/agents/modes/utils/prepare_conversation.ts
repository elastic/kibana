/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAction,
  ConversationRound,
  ConverseInput,
  RoundInput,
} from '@kbn/agent-builder-common';
import { createBadRequestError, createInternalError } from '@kbn/agent-builder-common';
import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  getLatestVersion,
  hashContent,
} from '@kbn/agent-builder-common/attachments';
import type { ProcessedAttachment, ProcessedRoundInput } from '@kbn/agent-builder-server';
import type {
  AttachmentFormatContext,
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

export type ProcessedConversationRound = Omit<ConversationRound, 'input'> & {
  input: ProcessedRoundInput;
};

export interface ProcessedConversation {
  previousRounds: ProcessedConversationRound[];
  nextInput: ProcessedRoundInput;
  attachmentTypes: ProcessedAttachmentType[];
  attachments: ProcessedAttachment[];
  attachmentStateManager: AttachmentStateManager;
  /** Presentation configuration for versioned attachments (inline vs summary mode) */
  versionedAttachmentPresentation?: AttachmentPresentation;
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
  inputs: AttachmentInput[]
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
        continue;
      }
    }

    const contentHash = hashContent(input.data);
    const contentKey = `${input.type}:${contentHash}`;
    if (existingByContentKey.has(contentKey)) {
      // already present (same content), nothing to do
      continue;
    }

    const created = await attachmentStateManager.add(
      {
        ...(input.id ? { id: input.id } : {}),
        type: input.type,
        data: input.data,
        ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
      },
      ATTACHMENT_REF_ACTOR.user
    );

    const latest = getLatestVersion(created);
    if (latest) {
      existingByContentKey.set(`${created.type}:${latest.content_hash}`, created.id);
    }
  }
};

/**
 * Prepare conversation rounds and input based on the action.
 * - 'regenerate': Strip the last round and use its input for re-execution
 * - Default: Use rounds and input as provided
 */
const prepareForAction = ({
  action,
  previousRounds,
  nextInput,
}: {
  action?: ConversationAction;
  previousRounds: ConversationRound[];
  nextInput: ConverseInput;
}): { effectiveRounds: ConversationRound[]; effectiveNextInput: ConverseInput } => {
  // Regenerate: strip the last round and use its original input
  if (action === 'regenerate') {
    if (previousRounds.length === 0) {
      throw createBadRequestError('Cannot regenerate: conversation has no rounds');
    }
    const lastRound = previousRounds[previousRounds.length - 1];
    // Faithfully replay the original request by copying the full stored input shape
    const regenerateInput: ConverseInput = { ...lastRound.input };
    // Strip the last round from previous rounds
    return {
      effectiveRounds: previousRounds.slice(0, -1),
      effectiveNextInput: regenerateInput,
    };
  }

  // Default: use rounds and input as provided
  return { effectiveRounds: previousRounds, effectiveNextInput: nextInput };
};

export const prepareConversation = async ({
  previousRounds,
  nextInput,
  context,
  action,
}: {
  previousRounds: ConversationRound[];
  nextInput: ConverseInput;
  context: AgentHandlerContext;
  action?: ConversationAction;
}): Promise<ProcessedConversation> => {
  const { attachments: attachmentsService, attachmentStateManager } = context;
  const formatContext = createFormatContext(context);

  // Handle regenerate action: use last round's input and strip it from previous rounds
  const { effectiveRounds, effectiveNextInput } = prepareForAction({
    action,
    previousRounds,
    nextInput,
  });

  // Promote any legacy per-round attachments into conversation-level versioned attachments.
  // We merge both previous rounds and next input, then strip per-round attachments so the LLM
  // only sees the v2 conversation-level attachments (via attachment presentation/tools).
  const previousAttachments = effectiveRounds.flatMap(
    (round) => round.input.attachments ?? []
  ) as AttachmentInput[];
  const nextInputAttachments = (effectiveNextInput.attachments ?? []) as AttachmentInput[];

  await mergeInputAttachmentsIntoAttachmentState(attachmentStateManager, previousAttachments);
  attachmentStateManager.clearAccessTracking();
  await mergeInputAttachmentsIntoAttachmentState(attachmentStateManager, nextInputAttachments);

  const strippedNextInput: ConverseInput = { ...effectiveNextInput, attachments: [] };
  const processedNextInput = await prepareRoundInput({
    input: strippedNextInput,
    attachmentsService,
    formatContext,
  });

  const processedRounds = await Promise.all(
    effectiveRounds.map((round) => {
      const strippedRound: ConversationRound = {
        ...round,
        input: { ...round.input, attachments: [] },
      };
      return prepareRound({ round: strippedRound, attachmentsService, formatContext });
    })
  );

  const allAttachments = [
    ...processedNextInput.attachments,
    ...processedRounds.flatMap((round) => round.input.attachments),
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

  const versionedAttachmentPresentation = await prepareAttachmentPresentation(
    attachmentStateManager.getAll(),
    undefined,
    async (attachment, data) => {
      const definition = attachmentsService.getTypeDefinition(attachment.type);
      if (!definition) {
        return undefined;
      }

      try {
        const typeReadonly = definition.isReadonly ?? true;
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
    previousRounds: processedRounds,
    attachmentTypes,
    attachments: allAttachments,
    attachmentStateManager,
    versionedAttachmentPresentation,
  };
};

const prepareRound = async ({
  round,
  attachmentsService,
  formatContext,
}: {
  round: ConversationRound;
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
}): Promise<ProcessedConversationRound> => {
  return {
    ...round,
    input: await prepareRoundInput({ input: round.input, attachmentsService, formatContext }),
  };
};

const prepareRoundInput = async ({
  input,
  attachmentsService,
  formatContext,
}: {
  input: RoundInput | ConverseInput;
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
  return {
    ...input,
    id: input.id ?? getToolResultId(),
  };
};

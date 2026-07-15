/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionSummary,
  ConversationAction,
  ConversationRound,
  ConverseInput,
  RoundInput,
} from '@kbn/agent-builder-common';
import { createBadRequestError } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  getLatestVersion,
  getContentKey,
} from '@kbn/agent-builder-common/attachments';
import type {
  ProcessedAttachment,
  ProcessedAttachmentType,
  ProcessedRoundInput,
} from '@kbn/agent-builder-server';
import type {
  AttachmentResolveContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';
import type { AgentHandlerContext } from '@kbn/agent-builder-server/agents';

import { mergeAttachmentRefs } from './add_round_complete_event';
import {
  type AttachmentContextProvider,
  buildAttachmentContext,
  makeAttachmentContextProvider,
} from './attachment_context';

export type ProcessedConversationRound = Omit<ConversationRound, 'input'> & {
  input: ProcessedRoundInput;
};

export interface ProcessedConversation {
  previousRounds: ProcessedConversationRound[];
  nextInput: ProcessedRoundInput;
  attachmentTypes: ProcessedAttachmentType[];
  attachments: ProcessedAttachment[];
  attachmentStateManager: AttachmentStateManager;
  /** Compaction summary covering older rounds that were replaced by this summary */
  compactionSummary?: CompactionSummary;
}

/**
 * Promote legacy per-round attachments into conversation-level versioned attachments.
 **/
const mergeInputAttachmentsIntoAttachmentState = async (
  attachmentStateManager: AttachmentStateManager,
  inputs: AttachmentInput[],
  options: { updateOriginSnapshot?: boolean; resolveContext: AttachmentResolveContext }
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
      options.resolveContext
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
  const attachmentContextProvider = makeAttachmentContextProvider();
  const resolveContext: AttachmentResolveContext = {
    request: context.request,
    spaceId: context.spaceId,
    savedObjectsClient: context.savedObjectsClient,
  };

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

  await mergeInputAttachmentsIntoAttachmentState(attachmentStateManager, previousAttachments, {
    resolveContext,
  });
  attachmentStateManager.clearAccessTracking();
  await mergeInputAttachmentsIntoAttachmentState(attachmentStateManager, nextInputAttachments, {
    updateOriginSnapshot: true,
    resolveContext,
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

  const processedRounds: ProcessedConversationRound[] = [];
  for (const round of effectiveRounds) {
    const strippedRound: ConversationRound = {
      ...round,
      input: { ...round.input, attachments: [] },
    };
    processedRounds.push(
      await prepareRound({
        round: strippedRound,
        attachmentContextProvider,
        attachmentsService,
        attachmentStateManager,
      })
    );
  }

  const processedNextInput = await prepareRoundInput({
    input: strippedNextInput,
    attachmentContextProvider,
    attachmentsService,
    attachmentStateManager,
  });

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

  return {
    nextInput: processedNextInput,
    previousRounds: processedRounds,
    attachmentTypes,
    attachments: allAttachments,
    attachmentStateManager,
  };
};

const prepareRound = async ({
  round,
  attachmentContextProvider,
  attachmentsService,
  attachmentStateManager,
}: {
  round: ConversationRound;
  attachmentContextProvider: AttachmentContextProvider;
  attachmentsService: AttachmentsService;
  attachmentStateManager: AttachmentStateManager;
}): Promise<ProcessedConversationRound> => {
  return {
    ...round,
    input: await prepareRoundInput({
      input: round.input,
      attachmentContextProvider,
      attachmentsService,
      attachmentStateManager,
    }),
  };
};

const prepareRoundInput = async ({
  input,
  attachmentContextProvider,
  attachmentsService,
  attachmentStateManager,
}: {
  input: RoundInput | ConverseInput;
  attachmentContextProvider: AttachmentContextProvider;
  attachmentsService: AttachmentsService;
  attachmentStateManager: AttachmentStateManager;
}): Promise<ProcessedRoundInput> => {
  const inputAttachments: Partial<ProcessedRoundInput> = {};
  if (input.attachment_refs) {
    inputAttachments.attachment_refs = input.attachment_refs;
    const typeInstructionsNeeded: string[] = [];
    for (const ref of inputAttachments.attachment_refs) {
      const type = attachmentStateManager.get(ref.attachment_id)?.type;
      if (type && attachmentContextProvider.areTypeInstructionsNeeded(type)) {
        typeInstructionsNeeded.push(type);
        attachmentContextProvider.markTypeInstructionsProvided(type);
      }
    }

    if (typeInstructionsNeeded.length > 0) {
      // build type instructions for round
      inputAttachments.attachment_types = typeInstructionsNeeded.map((type) => {
        const definition = attachmentsService.getTypeDefinition(type);
        const description = definition?.getAgentDescription?.() ?? undefined;
        return {
          type,
          description,
        };
      });
    }
    if ('attachment_context' in input && input.attachment_context) {
      inputAttachments.attachment_context = input.attachment_context;
    } else {
      inputAttachments.attachment_context = buildAttachmentContext(
        input.attachment_refs,
        attachmentStateManager
      );
    }
  }

  return {
    message: input.message ?? '',
    // attachments are always stripped before this function. this is hear to satisfy the type
    // for legacy compatibility
    attachments: [],
    ...inputAttachments,
  };
};

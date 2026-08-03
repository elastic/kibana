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
import type { ProcessedAttachmentType, ProcessedRoundInput } from '@kbn/agent-builder-server';
import type {
  AttachmentResolveContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AgentHandlerContext } from '@kbn/agent-builder-server/agents';

import { mergeAttachmentRefs } from './add_round_complete_event';
import { formatAttachmentsMetadata } from './attachment_presentation';

export type ProcessedConversationRound = Omit<ConversationRound, 'input'> & {
  input: ProcessedRoundInput;
};

export interface ProcessedConversation {
  previousRounds: ProcessedConversationRound[];
  nextInput: ProcessedRoundInput;
  attachmentTypes: ProcessedAttachmentType[];
  attachmentStateManager: AttachmentStateManager;
  /** Compaction summary covering older rounds that were replaced by this summary */
  compactionSummary?: CompactionSummary;
}

/**
 * Promote legacy per-round attachments into conversation-level versioned attachments.
 **/
const mergeInputAttachmentsIntoAttachmentState = async (
  attachmentStateManager: AttachmentStateManager,
  attachmentContentByKey: Map<string, string>,
  inputs: AttachmentInput[],
  options: { updateOriginSnapshot?: boolean; resolveContext: AttachmentResolveContext }
): Promise<void> => {
  if (inputs.length === 0) return;

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
    if (attachmentContentByKey.has(contentKey)) {
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
      attachmentContentByKey.set(`${created.type}:${latest.content_hash}`, created.id);
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
  const resolveContext: AttachmentResolveContext = {
    request: context.request,
    spaceId: context.spaceId,
    savedObjectsClient: context.savedObjectsClient,
  };

  // Pre-populate content keys from already-known attachments to detect duplicates.
  const attachmentContentByKey = new Map<string, string>();
  for (const existing of attachmentStateManager.getAll()) {
    const latest = getLatestVersion(existing);
    if (latest) {
      attachmentContentByKey.set(`${existing.type}:${latest.content_hash}`, existing.id);
    }
  }

  // Handle regenerate action: use last round's input and strip it from previous rounds
  const { effectiveRounds, effectiveNextInput } = prepareForAction({
    action,
    previousRounds,
    nextInput,
  });

  const processedRounds: ProcessedConversationRound[] = [];
  for (const round of effectiveRounds) {
    attachmentStateManager.clearAccessTracking();
    // migrate legacy attachments to state manger and updates refs for this round
    if (round.input.attachments && round.input.attachments.length > 0) {
      await mergeInputAttachmentsIntoAttachmentState(
        attachmentStateManager,
        attachmentContentByKey,
        round.input.attachments,
        { resolveContext }
      );
    }
    const attachmentRefs = mergeAttachmentRefs(
      round.input.attachment_refs,
      attachmentStateManager.getAccessedRefs()
    );
    const strippedRound: ConversationRound = {
      ...round,
      input: {
        ...round.input,
        attachments: [],
        attachment_refs: attachmentRefs,
      },
    };
    processedRounds.push(prepareRound({ round: strippedRound, attachmentStateManager }));
  }

  attachmentStateManager.clearAccessTracking();
  const nextInputAttachments = (effectiveNextInput.attachments ?? []) as AttachmentInput[];
  await mergeInputAttachmentsIntoAttachmentState(
    attachmentStateManager,
    attachmentContentByKey,
    nextInputAttachments,
    { updateOriginSnapshot: true, resolveContext }
  );
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
    attachmentStateManager,
  });

  const roundAttachmentTypes = [
    ...(processedNextInput.attachment_refs ?? []),
    ...processedRounds.flatMap((round) => round.input.attachment_refs ?? []),
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
    previousRounds: processedRounds,
    attachmentTypes,
    attachmentStateManager,
  };
};

const prepareRound = ({
  round,
  attachmentStateManager,
}: {
  round: ConversationRound;
  attachmentStateManager: AttachmentStateManager;
}): ProcessedConversationRound => {
  return {
    ...round,
    input: prepareRoundInput({ input: round.input, attachmentStateManager }),
  };
};

const prepareRoundInput = ({
  input,
  attachmentStateManager,
}: {
  input: RoundInput | ConverseInput;
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
    ...inputAttachments,
  };
};

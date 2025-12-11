/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, RawRoundInput, RoundInput } from '@kbn/onechat-common';
import { createInternalError } from '@kbn/onechat-common';
import type {
  Attachment,
  AttachmentInput,
  VersionedAttachment,
} from '@kbn/onechat-common/attachments';
import {
  AttachmentType,
  getLatestVersion,
  hashContent,
  type VisualizationRefAttachmentData,
} from '@kbn/onechat-common/attachments';
import type { AttachmentsService } from '@kbn/onechat-server/runner';
import { getToolResultId } from '@kbn/onechat-server/tools';
import type {
  AttachmentRepresentation,
  AttachmentBoundedTool,
} from '@kbn/onechat-server/attachments';
import type { AttachmentStateManager } from '@kbn/onechat-server/attachments';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  prepareAttachmentPresentation,
  type AttachmentPresentation,
} from './attachment_presentation';
import { savedObjectResolver } from '../../../attachments/saved_object_resolver';

export interface ProcessedAttachment {
  attachment: Attachment;
  representation: AttachmentRepresentation;
  tools: AttachmentBoundedTool[];
}

export interface ProcessedAttachmentType {
  type: string;
  description?: string;
}

export interface ProcessedRoundInput {
  message: string;
  attachments: ProcessedAttachment[];
}

export type ProcessedConversationRound = Omit<ConversationRound, 'input'> & {
  input: ProcessedRoundInput;
};

export interface ProcessedConversation {
  previousRounds: ProcessedConversationRound[];
  nextInput: ProcessedRoundInput;
  attachmentTypes: ProcessedAttachmentType[];
  attachments: ProcessedAttachment[];
  /** Conversation-level versioned attachments (if any) */
  conversationAttachments?: VersionedAttachment[];
  /** Prepared presentation for LLM context */
  attachmentPresentation?: AttachmentPresentation;
}

export const prepareConversation = async ({
  previousRounds,
  nextInput,
  attachmentsService,
  conversationAttachments,
  attachmentStateManager,
  savedObjectsClient,
}: {
  previousRounds: ConversationRound[];
  nextInput: RawRoundInput;
  attachmentsService: AttachmentsService;
  /** NEW: Conversation-level versioned attachments */
  conversationAttachments?: VersionedAttachment[];
  /** Optional: Attachment state manager to update by-ref attachments */
  attachmentStateManager?: AttachmentStateManager;
  /** Optional: Saved objects client for resolving by-ref attachments */
  savedObjectsClient?: SavedObjectsClientContract;
}): Promise<ProcessedConversation> => {
  const processedNextInput = await prepareRoundInput({ input: nextInput, attachmentsService });
  const processedRounds = await Promise.all(
    previousRounds.map((round) => {
      return prepareRound({ round, attachmentsService });
    })
  );

  const allAttachments = [
    ...processedNextInput.attachments,
    ...processedRounds.flatMap((round) => round.input.attachments),
  ];

  const attachmentTypeIds = [
    ...new Set<string>([...allAttachments.map((attachment) => attachment.attachment.type)]),
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

  // Re-resolve all by-ref attachments before presenting to LLM
  // This ensures we detect any changes to underlying saved objects
  if (attachmentStateManager && savedObjectsClient && conversationAttachments?.length) {
    await resolveByRefAttachments({
      attachmentStateManager,
      savedObjectsClient,
    });
  }

  // Get updated attachments after resolution (may have new versions)
  const updatedConversationAttachments = attachmentStateManager?.toArray() ?? conversationAttachments;

  // Prepare attachment presentation if conversation has versioned attachments
  const attachmentPresentation = updatedConversationAttachments?.length
    ? prepareAttachmentPresentation(updatedConversationAttachments)
    : undefined;

  return {
    nextInput: processedNextInput,
    previousRounds: processedRounds,
    attachmentTypes,
    attachments: allAttachments,
    conversationAttachments: updatedConversationAttachments,
    attachmentPresentation,
  };
};

const prepareRound = async ({
  round,
  attachmentsService,
}: {
  round: ConversationRound;
  attachmentsService: AttachmentsService;
}): Promise<ProcessedConversationRound> => {
  return {
    ...round,
    input: await prepareRoundInput({ input: round.input, attachmentsService }),
  };
};

const prepareRoundInput = async ({
  input,
  attachmentsService,
}: {
  input: RoundInput | RawRoundInput;
  attachmentsService: AttachmentsService;
}): Promise<ProcessedRoundInput> => {
  let attachments: ProcessedAttachment[] = [];
  if (input.attachments?.length) {
    attachments = await Promise.all(
      input.attachments.map((attachment) => {
        return prepareAttachment({ attachment, attachmentsService });
      })
    );
  }
  return {
    message: input.message,
    attachments,
  };
};

const prepareAttachment = async ({
  attachment: input,
  attachmentsService,
}: {
  attachment: AttachmentInput;
  attachmentsService: AttachmentsService;
}): Promise<ProcessedAttachment> => {
  const definition = attachmentsService.getTypeDefinition(input.type);
  if (!definition) {
    throw createInternalError(`Found attachment with unknown type: "${input.type}"`);
  }

  const attachment = inputToFinal(input);
  const formatted = await definition.format(attachment);
  const tools = formatted.getBoundedTools ? await formatted.getBoundedTools() : [];

  return {
    attachment,
    representation: await formatted.getRepresentation(),
    tools,
  };
};

const inputToFinal = (input: AttachmentInput): Attachment => {
  return {
    ...input,
    id: input.id ?? getToolResultId(),
  };
};

/**
 * Resolves all by-ref attachments (e.g., visualization_ref) and updates them if content changed.
 * This ensures the LLM sees the latest content and version numbers are updated accordingly.
 */
const resolveByRefAttachments = async ({
  attachmentStateManager,
  savedObjectsClient,
}: {
  attachmentStateManager: AttachmentStateManager;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<void> => {
  const allAttachments = attachmentStateManager.getAll();

  // Find all visualization_ref attachments
  const refAttachments = allAttachments.filter(
    (attachment) => attachment.type === AttachmentType.visualizationRef
  );

  if (refAttachments.length === 0) {
    return;
  }

  // eslint-disable-next-line no-console
  console.debug('[resolveByRefAttachments] Resolving', refAttachments.length, 'by-ref attachments');

  // Resolve each ref attachment in parallel
  await Promise.all(
    refAttachments.map(async (attachment) => {
      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) {
        return;
      }

      const refData = latestVersion.data as VisualizationRefAttachmentData;

      try {
        // Resolve the saved object
        const resolution = await savedObjectResolver.resolve(
          refData.saved_object_id,
          refData.saved_object_type,
          savedObjectsClient
        );

        if (!resolution.found) {
          // eslint-disable-next-line no-console
          console.debug('[resolveByRefAttachments] Saved object not found:', refData.saved_object_id);
          return;
        }

        // Check if content has changed by comparing hashes
        const newContentHash = hashContent(resolution.content);
        const cachedContentHash = refData.resolved_content
          ? hashContent(refData.resolved_content)
          : null;
        const contentChanged = cachedContentHash !== null && cachedContentHash !== newContentHash;

        // Update if content changed or if this is the first resolution
        if (contentChanged || !refData.resolved_content) {
          // eslint-disable-next-line no-console
          console.debug('[resolveByRefAttachments] Updating attachment:', attachment.id, {
            contentChanged,
            firstResolution: !refData.resolved_content,
          });

          const updatedRefData: VisualizationRefAttachmentData = {
            ...refData,
            title: resolution.title || refData.title,
            description: resolution.description || refData.description,
            last_resolved_at: new Date().toISOString(),
            resolved_content: resolution.content,
          };

          // This creates a new version if content changed
          attachmentStateManager.update(attachment.id, updatedRefData);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug('[resolveByRefAttachments] Error resolving attachment:', attachment.id, error);
        // Don't fail the whole operation if one attachment fails to resolve
      }
    })
  );
};

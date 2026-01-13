/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ConverseInput, RoundInput } from '@kbn/agent-builder-common';
import { createInternalError } from '@kbn/agent-builder-common';
import type {
  Attachment,
  AttachmentInput,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentFormatContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';
import type { AgentHandlerContext } from '@kbn/agent-builder-server/agents';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type {
  AttachmentRepresentation,
  AttachmentBoundedTool,
} from '@kbn/agent-builder-server/attachments';
import type { ToolRegistry } from '../../../tools';
import {
  prepareAttachmentPresentation,
  type AttachmentPresentation,
} from './attachment_presentation';
import { cleanToolCallHistory } from './clean_tool_history';

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

export const prepareConversation = async ({
  previousRounds,
  nextInput,
  context,
  conversationAttachments,
  toolRegistry,
}: {
  previousRounds: ConversationRound[];
  nextInput: ConverseInput;
  context: AgentHandlerContext;
  conversationAttachments?: VersionedAttachment[];
  toolRegistry?: ToolRegistry;
}): Promise<ProcessedConversation> => {
  const { attachments: attachmentsService, attachmentStateManager } = context;
  const formatContext = createFormatContext(context);

  const processedNextInput = await prepareRoundInput({
    input: nextInput,
    attachmentsService,
    formatContext,
  });

  const cleanedRounds = toolRegistry
    ? await cleanToolCallHistory(previousRounds, toolRegistry)
    : previousRounds;

  const processedRounds = await Promise.all(
    cleanedRounds.map((round) => {
      return prepareRound({ round, attachmentsService, formatContext });
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

  const versionedAttachmentPresentation = conversationAttachments
    ? prepareAttachmentPresentation(conversationAttachments)
    : undefined;

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

    return {
      attachment,
      representation: await formatted.getRepresentation(),
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

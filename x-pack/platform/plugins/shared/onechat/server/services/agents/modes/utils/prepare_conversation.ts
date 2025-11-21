/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, RawRoundInput, RoundInput } from '@kbn/onechat-common';
import { createInternalError } from '@kbn/onechat-common';
import type { Attachment, AttachmentInput } from '@kbn/onechat-common/attachments';
import type { AttachmentsService } from '@kbn/onechat-server/runner';
import { getToolResultId } from '@kbn/onechat-server/tools';
import type { AttachmentRepresentation } from '@kbn/onechat-server/attachments';

export interface ProcessedAttachment {
  attachment: Attachment;
  representation: AttachmentRepresentation;
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
}

export const prepareConversation = async ({
  previousRounds,
  nextInput,
  attachmentsService,
}: {
  previousRounds: ConversationRound[];
  nextInput: RawRoundInput;
  attachmentsService: AttachmentsService;
}): Promise<ProcessedConversation> => {
  const processedNextInput = await prepareRoundInput({ input: nextInput, attachmentsService });
  const processedRounds = await Promise.all(
    previousRounds.map((round) => {
      return prepareRound({ round, attachmentsService });
    })
  );

  const attachmentTypeIds = [
    ...new Set<string>([
      ...processedNextInput.attachments.map((attachment) => attachment.attachment.type),
      ...processedRounds.flatMap((round) =>
        round.input.attachments.map((attachment) => attachment.attachment.type)
      ),
    ]),
  ];

  const attachmentTypes = await Promise.all(
    attachmentTypeIds.map<Promise<ProcessedAttachmentType>>(async (type) => {
      const definition = attachmentsService.getTypeDefinition(type);
      const description = definition?.getAgentDescription?.() ?? '';

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

  return {
    attachment,
    representation: await formatted.getRepresentation(),
  };
};

const inputToFinal = (input: AttachmentInput): Attachment => {
  return {
    ...input,
    id: input.id ?? getToolResultId(),
  };
};

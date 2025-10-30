/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, RawRoundInput, RoundInput } from '@kbn/onechat-common';
import type { Attachment, AttachmentInput } from '@kbn/onechat-common/attachments';
import type { AttachmentsService } from '@kbn/onechat-server/runner';
import { getToolResultId } from '@kbn/onechat-server/tools';
import type { AttachmentRepresentation } from '@kbn/onechat-server/attachments';

export interface ProcessedAttachment {
  attachment: Attachment;
  representation: AttachmentRepresentation;
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
  return {
    nextInput: processedNextInput,
    previousRounds: await Promise.all(
      previousRounds.map((round) => {
        return prepareRound({ round, attachmentsService });
      })
    ),
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
  attachment,
  attachmentsService,
}: {
  attachment: AttachmentInput;
  attachmentsService: AttachmentsService;
}): Promise<ProcessedAttachment> => {
  const representation = await attachmentsService.format(attachment);
  return {
    attachment: inputToFinal(attachment),
    representation,
  };
};

const inputToFinal = (input: AttachmentInput): Attachment => {
  return {
    ...input,
    id: input.id ?? getToolResultId(),
  };
};

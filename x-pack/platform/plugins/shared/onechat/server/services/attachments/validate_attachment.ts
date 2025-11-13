/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment, AttachmentInput } from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { getToolResultId } from '@kbn/onechat-server/tools';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

export type ValidateAttachmentResult =
  | { valid: true; attachment: Attachment }
  | { valid: false; error: string };

export const validateAttachment = async ({
  attachment,
  registry,
}: {
  attachment: AttachmentInput;
  registry: AttachmentTypeRegistry;
}): Promise<ValidateAttachmentResult> => {
  if (!registry.has(attachment.type)) {
    return { valid: false, error: `Unknown attachment type: ${attachment.type}` };
  }
  const typeDefinition = registry.get(attachment.type)! as AttachmentTypeDefinition<any>;

  const typeValidation = await typeDefinition.validate(attachment.data);
  if (typeValidation.valid) {
    return {
      valid: true,
      attachment: {
        type: attachment.type,
        id: attachment.id ?? getToolResultId(),
        data: typeValidation.data,
        hidden: attachment.hidden,
      },
    };
  } else {
    return { valid: false, error: typeValidation.error };
  }
};

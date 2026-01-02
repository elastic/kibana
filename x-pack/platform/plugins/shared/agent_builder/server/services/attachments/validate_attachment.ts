/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

export type ValidateAttachmentResult<Type extends string, Data> =
  | { valid: true; attachment: Attachment<Type, Data> }
  | { valid: false; error: string };

export const validateAttachment = async <Type extends string, Data>({
  attachment,
  registry,
}: {
  attachment: AttachmentInput<Type, Data>;
  registry: AttachmentTypeRegistry;
}): Promise<ValidateAttachmentResult<Type, Data>> => {
  if (!registry.has(attachment.type)) {
    return { valid: false, error: `Unknown attachment type: ${attachment.type}` };
  }
  const typeDefinition = registry.get(attachment.type)! as AttachmentTypeDefinition<any>;

  try {
    const typeValidation = await typeDefinition.validate(attachment.data);
    if (typeValidation.valid) {
      return {
        valid: true,
        attachment: {
          id: attachment.id ?? getToolResultId(),
          type: attachment.type,
          data: typeValidation.data as Data,
          hidden: attachment.hidden,
        },
      };
    } else {
      return { valid: false, error: typeValidation.error };
    }
  } catch (e) {
    return { valid: false, error: `Error during attachment validation: ${e.message}` };
  }
};

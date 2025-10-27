/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentInput,
  UnvalidatedAttachment,
} from '@kbn/onechat-common/artifacts/attachments';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

export type ValidateAttachmentResult =
  | { valid: true; attachment: AttachmentInput }
  | { valid: false; error: string };

export const validateAttachment = async ({
  attachment,
  registry,
}: {
  attachment: UnvalidatedAttachment; // TODO: use more loose type
  registry: AttachmentTypeRegistry;
}): Promise<ValidateAttachmentResult> => {
  if (!registry.has(attachment.type)) {
    return { valid: false, error: `Unknown attachment type: ${attachment.type}` };
  }
  const typeDefinition = registry.get(attachment.type)!;

  const typeValidation = await typeDefinition.validate(attachment.data);
  if (typeValidation.valid) {
    return {
      valid: true,
      attachment: {
        type: attachment.type,
        id: attachment.id ?? 'todo', // TODO: fix
        data: typeValidation.data as any, // TODO: fix
      },
    };
  } else {
    return { valid: false, error: typeValidation.error };
  }
};

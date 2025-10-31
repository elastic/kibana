/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/onechat-common/attachments';
import type { AttachmentRepresentation } from '@kbn/onechat-server/attachments';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

export const formatAttachment = async ({
  attachment,
  registry,
}: {
  attachment: Attachment;
  registry: AttachmentTypeRegistry;
}): Promise<AttachmentRepresentation> => {
  if (!registry.has(attachment.type)) {
    throw new Error(`Unknown attachment type: ${attachment.type}`);
  }
  const typeDefinition = registry.get(attachment.type)!;
  return await typeDefinition.format(attachment.data);
};

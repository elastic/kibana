/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

export const validateAttachments = async ({
  attachments,
  registry,
  resolveContext,
}: {
  attachments: AttachmentInput[] | undefined;
  registry: AttachmentTypeRegistry;
  resolveContext: AttachmentResolveContext;
}): Promise<AttachmentInput[] | undefined> => {
  if (!attachments || attachments.length === 0) {
    return undefined;
  }

  const validated: AttachmentInput[] = [];

  for (const attachment of attachments) {
    if (!registry.has(attachment.type)) {
      throw new Error(`Attachment validation failed: Unknown attachment type: ${attachment.type}`);
    }

    const typeDefinition = registry.get(attachment.type)!;

    try {
      const resolvedData = await resolveAttachment({ attachment, resolveContext, typeDefinition });
      const typeValidation = await typeDefinition.validate(resolvedData);

      if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
      }

      validated.push({
        id: attachment.id ?? getToolResultId(),
        type: attachment.type,
        data: typeValidation.data,
        hidden: attachment.hidden,
        ...(attachment.origin !== undefined ? { origin: attachment.origin } : {}),
        ...(attachment.description !== undefined ? { description: attachment.description } : {}),
        ...(attachment.group_id !== undefined ? { group_id: attachment.group_id } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Attachment validation failed: ${message}`);
    }
  }

  return validated;
};

const resolveAttachment = async <Type extends string, Data>({
  attachment,
  resolveContext,
  typeDefinition,
}: {
  attachment: AttachmentInput<Type, Data>;
  resolveContext: AttachmentResolveContext;
  typeDefinition: AttachmentTypeDefinition;
}): Promise<Data> => {
  if (attachment.data !== undefined) {
    return attachment.data;
  }

  if (attachment.origin === undefined) {
    throw new Error('Either data or origin must be provided for an attachment');
  }

  if (!typeDefinition.resolve) {
    throw new Error(`Attachment type "${attachment.type}" does not support resolving from origin`);
  }
  const resolved = await typeDefinition.resolve(attachment.origin, resolveContext);
  if (resolved == null) {
    throw new Error(
      `Failed to resolve content from origin for attachment type "${attachment.type}"`
    );
  }
  return resolved as Data;
};

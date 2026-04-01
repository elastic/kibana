/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

export type ValidateAttachmentResult<Type extends string, Data> =
  | { valid: true; attachment: Attachment<Type, Data> }
  | { valid: false; error: string };

export const validateAttachment = async <Type extends string, Data>({
  attachment,
  registry,
  resolveContext,
}: {
  attachment: AttachmentInput<Type, Data>;
  registry: AttachmentTypeRegistry;
  resolveContext: AttachmentResolveContext;
}): Promise<ValidateAttachmentResult<Type, Data>> => {
  if (!registry.has(attachment.type)) {
    return { valid: false, error: `Unknown attachment type: ${attachment.type}` };
  }

  const typeDefinition = registry.get(attachment.type)!;

  try {
    const resolvedData = await resolveAttachment({ attachment, resolveContext, typeDefinition });
    const typeValidation = await typeDefinition.validate(resolvedData);
    if (!typeValidation.valid) {
      return { valid: false, error: typeValidation.error };
    }

    return {
      valid: true,
      attachment: {
        id: attachment.id ?? getToolResultId(),
        type: attachment.type,
        data: typeValidation.data as Data,
        hidden: attachment.hidden,
        ...(attachment.origin !== undefined ? { origin: attachment.origin } : {}),
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { valid: false, error: `Error during attachment validation: ${message}` };
  }
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

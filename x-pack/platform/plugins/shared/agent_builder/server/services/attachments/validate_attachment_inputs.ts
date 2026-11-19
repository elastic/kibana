/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
  AttachmentValidateContext,
} from '@kbn/agent-builder-server/attachments';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { AttachmentTypeRegistry } from './attachment_type_registry';

/**
 * Validates the attachment inputs of a request, rejecting the whole request on the first
 * invalid one. Validation resolves by-reference attachments, so the returned inputs carry
 * resolved data.
 */
export const validateAttachmentInputs = async ({
  attachments,
  registry,
  resolveContext,
  validateContext,
}: {
  attachments: AttachmentInput[] | undefined;
  registry: AttachmentTypeRegistry;
  resolveContext: AttachmentResolveContext;
  validateContext: AttachmentValidateContext;
}): Promise<AttachmentInput[] | undefined> => {
  if (!attachments || attachments.length === 0) {
    return undefined;
  }

  const validated: AttachmentInput[] = [];

  for (const attachment of attachments) {
    const typeDefinition = registry.get(attachment.type);

    if (!typeDefinition) {
      throw createBadRequestError(
        `Attachment validation failed: Unknown attachment type: ${attachment.type}`
      );
    }

    try {
      const resolvedData = await resolveAttachment({ attachment, resolveContext, typeDefinition });
      const typeValidation = await typeDefinition.validate(resolvedData, validateContext);

      if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
      }

      validated.push({
        id: attachment.id ?? getToolResultId(),
        type: attachment.type,
        data: typeValidation.data,
        ...(attachment.hidden !== undefined ? { hidden: attachment.hidden } : {}),
        ...(attachment.origin !== undefined ? { origin: attachment.origin } : {}),
        ...(attachment.description !== undefined ? { description: attachment.description } : {}),
        ...(attachment.group_id !== undefined ? { group_id: attachment.group_id } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw createBadRequestError(`Attachment validation failed: ${message}`);
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

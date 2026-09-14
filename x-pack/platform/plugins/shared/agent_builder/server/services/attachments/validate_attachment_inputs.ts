/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { createBadRequestError } from '@kbn/agent-builder-common';
import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentServiceStart } from './types';

/**
 * Validates the attachment inputs of a request, rejecting the whole request on the first
 * invalid one. Validation resolves by-reference attachments, so the returned inputs carry
 * resolved data.
 */
export const validateAttachmentInputs = async ({
  attachmentsService,
  attachments,
  request,
}: {
  attachmentsService: AttachmentServiceStart;
  attachments: AttachmentInput[] | undefined;
  request: KibanaRequest;
}): Promise<AttachmentInput[] | undefined> => {
  if (!attachments || attachments.length === 0) {
    return undefined;
  }

  const validated: AttachmentInput[] = [];

  for (const attachment of attachments) {
    const result = await attachmentsService.validate(attachment, request);

    if (!result.valid) {
      throw createBadRequestError(`Attachment validation failed: ${result.error}`);
    }

    const { id, type, data, description, hidden, origin, groupId } =
      result.attachment as Attachment;

    validated.push({
      id,
      type,
      data,
      ...(description !== undefined ? { description } : {}),
      ...(hidden !== undefined ? { hidden } : {}),
      ...(origin !== undefined ? { origin } : {}),
      ...(groupId !== undefined ? { group_id: groupId } : {}),
    });
  }

  return validated;
};
